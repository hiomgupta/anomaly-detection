import os
import shutil
from PIL import Image
try:
    import piexif
    PIEXIF_AVAILABLE = True
except ImportError:
    PIEXIF_AVAILABLE = False

try:
    from PyPDF2 import PdfReader, PdfWriter
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

# Script to generate synthetic "tampered" documents for Hackathon Demo testing.

def generate_tampered_image(input_path: str, output_path: str):
    """
    Takes a clean image and injects 'Photoshop' EXIF data and Date mismatches 
    to simulate a tampered document.
    """
    if not PIEXIF_AVAILABLE:
        print("piexif not installed. Skipping image forgery generation.")
        return
        
    print(f"Generating tampered image from {input_path} -> {output_path}")
    img = Image.open(input_path)
    
    # 305 = Software, 306 = DateTime, 36867 = DateTimeOriginal
    zeroth_ifd = {
        305: b"Adobe Photoshop CS6 (Windows)",
        306: b"2023:05:10 12:00:00"
    }
    exif_ifd = {
        36867: b"2020:01:01 08:00:00"
    }
    
    exif_dict = {"0th": zeroth_ifd, "Exif": exif_ifd}
    exif_bytes = piexif.dump(exif_dict)
    
    img.save(output_path, exif=exif_bytes)
    print("Done: Fake EXIF metadata injected (Photoshop & Date Mismatch).")

def generate_tampered_pdf(input_path: str, output_path: str):
    """
    Takes a clean PDF and overwrites its metadata with suspicious PDF Editors
    to simulate structural tampering.
    """
    if not PYPDF_AVAILABLE:
        print("PyPDF2 not installed. Skipping PDF forgery generation.")
        return
        
    print(f"Generating tampered PDF from {input_path} -> {output_path}")
    reader = PdfReader(input_path)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # Inject Suspicious Metadata
    writer.add_metadata({
        "/Producer": "iLovePDF",
        "/Creator": "Smallpdf",
        "/CreationDate": "D:20201010120000Z",
        "/ModDate": "D:20231010120000Z"
    })

    with open(output_path, "wb") as f_out:
        writer.write(f_out)
        
    print("Done: Fake PDF metadata injected (iLovePDF & Date Mismatch).")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    demo_dir = os.path.join(base_dir, "demo_files")
    os.makedirs(demo_dir, exist_ok=True)
    
    print(f"Creating synthetic forgeries in {demo_dir}...")
    
    # Generate clean dummy files for testing if they don't exist
    dummy_img = os.path.join(demo_dir, "clean_document.jpg")
    if not os.path.exists(dummy_img):
        Image.new("RGB", (800, 600), color="white").save(dummy_img)
        
    dummy_pdf = os.path.join(demo_dir, "clean_document.pdf")
    if not os.path.exists(dummy_pdf) and PYPDF_AVAILABLE:
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        with open(dummy_pdf, "wb") as f:
            writer.write(f)
            
    # Generate Forgeries
    generate_tampered_image(dummy_img, os.path.join(demo_dir, "tampered_document.jpg"))
    if os.path.exists(dummy_pdf):
        generate_tampered_pdf(dummy_pdf, os.path.join(demo_dir, "tampered_document.pdf"))
        
    print("All forgeries generated successfully. You can upload these to the Dashboard to test the new Forensics engines!")
