import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
import uuid
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .models.document import DocumentRecord, DocumentSource
from .services.image_forensics import analyze_image_forensics
from .services.pdf_forensics import run_pdf_forensics
from .services.ocr import run_ocr_analysis
from .services.scoring import generate_final_score
from .services.preprocessing import preprocess_pdf_to_image
from .services.signature_forensics import analyze_signature
from .services.report_generator import generate_forensic_report
from .services.metadata_forensics import analyze_image_metadata
from .services.anomaly_scorer import score_anomaly, compute_file_hash, train_model


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Intelligent Banking Document Fraud Detection System")

class ReviewRequest(BaseModel):
    action: str  # "approve" or "reject"

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg"
]

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    source: DocumentSource = Form(...),
    document_category: str = Form("General"),
    is_signed: str = Form("false"),
    db: Session = Depends(get_db)
):
    try:
        # Validate File Type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format: {file.content_type}. Allowed formats are PDF, JPEG, and PNG."
            )
        
        # Validate File Size
        file.file.seek(0, 2)  # Seek to the end to get size
        file_size = file.file.tell()
        file.file.seek(0)  # Reset cursor
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 10MB limit."
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty."
            )

        # Generate unique filename to avoid collisions
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        secure_filename = f"{unique_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, secure_filename)

        # Read entire file into memory for hashing, then save to disk
        file_bytes = file.file.read()
        file_hash = compute_file_hash(file_bytes)

        # Deduplication: check if we've seen this exact file before
        existing = db.query(DocumentRecord).filter(DocumentRecord.file_hash == file_hash).first()
        if existing:
            flags_existing = json.loads(existing.flags) if existing.flags else []
            return {
                "message": "Duplicate document detected. This exact file was already analyzed.",
                "document_id": existing.id,
                "filename": existing.filename,
                "source": existing.source,
                "status": existing.status,
                "fraud_score": existing.fraud_score,
                "scores": json.loads(existing.scores) if existing.scores else {},
                "flags": flags_existing,
                "notes": ["Duplicate: matched SHA-256 hash of a previously analyzed document."]
            }

        # Write to disk
        with open(file_path, "wb") as buffer:
            buffer.write(file_bytes)
                
        is_pdf = file.content_type == "application/pdf"
        is_hard_copy = source == DocumentSource.HARD_COPY

        ela_score = 100.0
        edge_score = 100.0
        copy_move_score = 100.0
        pdf_score = 100.0
        ocr_score = 100.0
        metadata_score = 100.0
        signature_score = None
        flags = []
        notes = []

        if is_pdf:
            pdf_score, pdf_flags = run_pdf_forensics(file_path)
            flags.extend(pdf_flags)
            
            temp_img_path = preprocess_pdf_to_image(file_path)
            if temp_img_path and os.path.exists(temp_img_path):
                try:
                    img_ela, img_edge, img_cm, image_flags = analyze_image_forensics(temp_img_path)
                    img_ocr, ocr_flags = run_ocr_analysis(temp_img_path)
                    
                    ela_score = img_ela
                    edge_score = img_edge
                    copy_move_score = img_cm
                    ocr_score = img_ocr
                    
                    flags.extend(image_flags)
                    flags.extend(ocr_flags)
                    
                    if is_signed.lower() == "true":
                        sig_score, sig_flags = analyze_signature(temp_img_path)
                        signature_score = sig_score
                        flags.extend(sig_flags)
                finally:
                    try:
                        os.remove(temp_img_path)
                    except Exception as e:
                        import logging
                        logging.warning(f"Failed to clean up temp image {temp_img_path}: {e}")
            else:
                notes.append("Image/OCR checks skipped for PDF because conversion failed (PyMuPDF missing, corrupt PDF, or password protected)")
                pdf_score = 0.0
                ocr_score = 0.0
                flags.append("PDF conversion failed (possibly encrypted or corrupt)")
        else:
            pdf_score = None
            ela_score, edge_score, copy_move_score, image_flags = analyze_image_forensics(file_path)
            metadata_score, meta_flags = analyze_image_metadata(file_path)
            ocr_score, ocr_flags = run_ocr_analysis(file_path)
            flags.extend(image_flags)
            flags.extend(meta_flags)
            flags.extend(ocr_flags)
            if is_signed.lower() == "true":
                sig_score, sig_flags = analyze_signature(file_path)
                signature_score = sig_score
                flags.extend(sig_flags)
            notes.append("PDF structural checks skipped for image upload")

        fraud_score = generate_final_score(
            ela_score=ela_score,
            edge_score=edge_score,
            copy_move_score=copy_move_score,
            pdf_score=pdf_score,
            ocr_score=ocr_score,
            metadata_score=metadata_score,
            is_hard_copy=is_hard_copy,
            is_pdf=is_pdf,
            signature_score=signature_score,
            document_category=document_category,
        )

        status_value = "flagged" if fraud_score < 80 or flags else "verified"
        
        # Hard fail for critical security issues
        critical_keywords = ["malicious", "tampering", "corruption", "forgery"]
        for flag in flags:
            if any(keyword in flag.lower() for keyword in critical_keywords):
                fraud_score = 0.0
                status_value = "rejected"
                break

        final_scores = {
            "ela": ela_score,
            "edge": edge_score,
            "copy_move": copy_move_score,
            "pdf": pdf_score,
            "ocr": ocr_score,
            "metadata": metadata_score,
            "signature": signature_score
        }

        # Anomaly detection layer (Isolation Forest if trained, else reason codes only)
        anomaly_score, reason_codes = score_anomaly(final_scores)

        # Initialize Database Record
        db_document = DocumentRecord(
            filename=secure_filename,
            file_hash=file_hash,
            file_size_bytes=file_size,
            content_type=file.content_type,
            source=source,
            document_category=document_category,
            fraud_score=fraud_score,
            anomaly_score=anomaly_score,
            flags=json.dumps(flags),
            scores=json.dumps(final_scores),
            reason_codes=json.dumps(reason_codes),
            status=status_value,
            created_at=datetime.utcnow(),
            processed_at=datetime.utcnow()
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)

        # Try to retrain the anomaly model with this new data (non-blocking best-effort)
        if status_value == "verified":
            try:
                train_model(db)
            except Exception as e:
                import logging
                logging.warning(f"Anomaly model retraining failed (non-critical): {e}")
        
        return {
            "message": "File uploaded and analyzed successfully.",
            "document_id": db_document.id,
            "filename": db_document.filename,
            "file_hash": file_hash,
            "source": db_document.source,
            "status": db_document.status,
            "fraud_score": fraud_score,
            "anomaly_score": anomaly_score,
            "scores": final_scores,
            "flags": flags,
            "reason_codes": reason_codes,
            "notes": notes
        }
        
    except HTTPException as http_exc:
        # Re-raise HTTPExceptions to be handled by FastAPI
        raise http_exc
    except Exception as e:
        # Catch-all for unexpected errors (e.g., IO errors, DB errors)
        import traceback
        import logging
        logging.error(f"Unexpected error in upload_document: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the upload."
        )

def background_train_model():
    db = next(get_db())
    try:
        train_model(db)
    finally:
        db.close()

@app.post("/document/{document_id}/review")
def review_document(document_id: int, review: ReviewRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if review.action == "approve":
        doc.status = "verified_override"
        background_tasks.add_task(background_train_model)
    elif review.action == "reject":
        doc.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    return {"message": f"Document {review.action}d successfully", "status": doc.status}

@app.get("/stats/drift")
def get_concept_drift_stats(db: Session = Depends(get_db)):
    """
    Returns rolling mean anomaly scores per document category to detect concept drift.
    """
    from sqlalchemy import func
    
    results = db.query(
        DocumentRecord.document_category,
        func.count(DocumentRecord.id).label('count'),
        func.avg(DocumentRecord.fraud_score).label('avg_fraud_score'),
        func.avg(DocumentRecord.anomaly_score).label('avg_anomaly_score')
    ).group_by(DocumentRecord.document_category).all()
    
    drift_data = []
    for r in results:
        drift_data.append({
            "category": r.document_category,
            "count": r.count,
            "avg_fraud_score": round(r.avg_fraud_score, 1) if r.avg_fraud_score else None,
            "avg_anomaly_score": round(r.avg_anomaly_score, 1) if r.avg_anomaly_score else None
        })
        
    return {"drift_stats": drift_data}

def remove_file(path: str):
    try:
        os.remove(path)
    except Exception as e:
        import logging
        logging.warning(f"Failed to remove background temp file {path}: {e}")

@app.get("/document/{document_id}/report", response_class=FileResponse)
def get_document_report(document_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    pdf_path = generate_forensic_report(doc)
    background_tasks.add_task(remove_file, pdf_path)
    
    return FileResponse(
        path=pdf_path,
        media_type='application/pdf',
        filename=f"Forensic_Report_{doc.filename}.pdf"
    )
