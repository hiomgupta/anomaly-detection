import pytest
import os
import cv2
import numpy as np
from unittest.mock import patch

# --- The "Clever Fraudster" Edge Cases ---
# Fraudsters aren't going to send you textbook examples.
# They will exploit your naive math and regex parsing.

def test_ela_solid_black_image(tmp_path):
    """
    Test ELA with a purely uniform color image.
    If you calculate standard deviation on a solid black image, you get 0.
    If you divide by that 0, your server crashes. Don't be that developer.
    """
    from app.services.image_forensics import analyze_image_forensics
    
    # Create a literal solid black image
    img_path = tmp_path / "solid_black.png"
    black_img = np.zeros((500, 500, 3), dtype=np.uint8)
    cv2.imwrite(str(img_path), black_img)
    
    try:
        ela, edge, cm, flags = analyze_image_forensics(str(img_path))
        # If we got here, it didn't throw a division-by-zero error. Good job, maybe.
        assert isinstance(ela, (float, int)), "ELA score must be a float or int."
    except ZeroDivisionError:
        pytest.fail("You threw a ZeroDivisionError! I told you to check your denominators. Absolute amateur hour.")
    except Exception as e:
        pytest.fail(f"Your image processing crashed with an unexpected error: {e}. Handle your edge cases!")

def test_pdf_flat_no_metadata(tmp_path):
    """
    Feed the PDF service a 'flat' PDF (an image wrapped in a PDF) with zero metadata.
    It should return a 'Not Applicable' flag or handle gracefully, not crash.
    """
    from app.services.pdf_forensics import run_pdf_forensics
    
    # Generate a dummy flat PDF. Since we don't want to rely on reportlab being installed
    # purely for this test, we'll write a minimal manual PDF byte structure.
    pdf_path = tmp_path / "flat.pdf"
    minimal_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    pdf_path.write_bytes(minimal_pdf)
    
    try:
        score, flags = run_pdf_forensics(str(pdf_path))
        assert isinstance(score, (float, int))
    except AttributeError:
        pytest.fail("AttributeError? Let me guess, you tried to access pdf.getDocInfo().title without checking if it exists. Typical.")
    except Exception as e:
        pytest.fail(f"PDF processing crashed: {e}")

def test_ocr_math_garbage_text():
    """
    Mock the OCR service to return garbage text like Gross Salary: ₹45,,00,00.00x.
    Write a test to ensure the regex/math logic doesn't throw a ValueError 
    when trying to parse terrible string formats.
    """
    from app.services.ocr import run_ocr_analysis
    
    # We patch the raw text extraction step inside run_ocr_analysis.
    # Since we don't know exactly what lib you used (pytesseract or easyocr),
    # we patch the entire function as if it processed garbage to make sure it doesn't 
    # crash the main pipeline, or we can patch pytesseract if that's what's used.
    with patch("app.services.ocr.get_reader", create=True) as mock_get_reader:
        # Simulate OCR extracting absolute garbage
        mock_reader = mock_get_reader.return_value
        mock_reader.readtext.return_value = [
            (None, "Gross Salary: ₹45,,00,00.00x", 0.9),
            (None, "Net Income: 12..3$4", 0.9)
        ]
        
        # Create a dummy image
        dummy_img = "dummy.jpg"
        with open(dummy_img, "wb") as f:
            f.write(b"dummy")
            
        try:
            score, flags = run_ocr_analysis(dummy_img)
            # Should survive parsing that garbage and just return a score
            assert isinstance(score, (float, int))
        except ValueError:
            pytest.fail("ValueError! You tried to float('45,,00,00.00x') didn't you? Learn to use regex properly before parsing currency.")
        except Exception as e:
            pytest.fail(f"OCR logic crashed on garbage text: {e}")
        finally:
            if os.path.exists(dummy_img):
                os.remove(dummy_img)
