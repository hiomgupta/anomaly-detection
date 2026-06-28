import pytest
import os
from PIL import Image
try:
    from piexif import dump, insert
    PIEXIF_AVAILABLE = True
except ImportError:
    PIEXIF_AVAILABLE = False
from app.services.metadata_forensics import analyze_image_metadata

def test_metadata_no_exif(tmp_path):
    """Test image with no EXIF data returns perfect score."""
    img_path = tmp_path / "no_exif.jpg"
    img = Image.new("RGB", (100, 100), color="white")
    img.save(img_path)
    
    score, flags = analyze_image_metadata(str(img_path))
    assert score == 100.0
    assert len(flags) == 0

@pytest.mark.skipif(not PIEXIF_AVAILABLE, reason="piexif not installed")
def test_metadata_suspicious_software(tmp_path):
    """Test image with known editing software in EXIF (e.g. Photoshop)."""
    img_path = tmp_path / "photoshop.jpg"
    img = Image.new("RGB", (100, 100), color="white")
    
    # Create fake EXIF with Adobe Photoshop
    zeroth_ifd = {305: b"Adobe Photoshop CS6 (Windows)"}
    exif_dict = {"0th": zeroth_ifd}
    exif_bytes = dump(exif_dict)
    
    img.save(img_path, exif=exif_bytes)
    
    score, flags = analyze_image_metadata(str(img_path))
    
    assert score < 100.0
    assert any("Photoshop" in flag for flag in flags)

@pytest.mark.skipif(not PIEXIF_AVAILABLE, reason="piexif not installed")
def test_metadata_date_mismatch(tmp_path):
    """Test image where modification date is vastly different from original."""
    img_path = tmp_path / "date_mismatch.jpg"
    img = Image.new("RGB", (100, 100), color="white")
    
    # Exif tags: 306 = DateTime (modification), 36867 = DateTimeOriginal
    zeroth_ifd = {306: b"2023:05:10 12:00:00"}
    exif_ifd = {36867: b"2020:01:01 08:00:00"}
    exif_dict = {"0th": zeroth_ifd, "Exif": exif_ifd}
    exif_bytes = dump(exif_dict)
    
    img.save(img_path, exif=exif_bytes)
    
    score, flags = analyze_image_metadata(str(img_path))
    
    assert score < 100.0
    assert any("date mismatch" in flag.lower() for flag in flags)
