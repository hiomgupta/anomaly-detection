import os
import uuid

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

def preprocess_pdf_to_image(pdf_path: str) -> str:
    """
    Converts the first page of a PDF to a temporary JPEG image.
    Returns the path to the temporary image, or None if conversion fails.
    """
    if fitz is None:
        return None

    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return None
            
        page = doc.load_page(0)
        # Render at a good DPI (matrix 2,2 means 2x zoom)
        # alpha=False ensures a white background instead of transparent!
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        
        unique_id = str(uuid.uuid4())
        temp_dir = "./uploads/temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_image_path = os.path.join(temp_dir, f"{unique_id}_page1.jpg")
        
        pix.save(temp_image_path)
        doc.close()
        
        return temp_image_path
    except Exception:
        return None
