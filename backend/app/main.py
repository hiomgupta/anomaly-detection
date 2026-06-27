import os
import uuid
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .models.document import DocumentRecord, DocumentSource

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Intelligent Banking Document Fraud Detection System")

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
async def upload_document(
    file: UploadFile = File(...),
    source: DocumentSource = Form(...),
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

        # Save File
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(8192):
                buffer.write(chunk)
                
        # Initialize Database Record
        db_document = DocumentRecord(
            filename=secure_filename,
            file_size_bytes=file_size,
            content_type=file.content_type,
            source=source,
            status="uploaded",
            created_at=datetime.utcnow()
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        
        # For now, return the saved record info
        return {
            "message": "File uploaded successfully.",
            "document_id": db_document.id,
            "filename": db_document.filename,
            "source": db_document.source,
            "status": db_document.status
        }
        
    except HTTPException as http_exc:
        # Re-raise HTTPExceptions to be handled by FastAPI
        raise http_exc
    except Exception as e:
        # Catch-all for unexpected errors (e.g., IO errors, DB errors)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the upload."
        )
