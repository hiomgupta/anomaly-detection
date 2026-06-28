import pytest
import os
from unittest.mock import patch
from app.services.pdf_forensics import check_pdf_structure_and_metadata

def test_pdf_structure_clean(tmp_path):
    """Test PDF with clean metadata and no incremental updates."""
    # Write a clean, simple PDF structure with PyPDF2 in the real implementation.
    # For testing, we mock PyPDF2 reader to return a clean dictionary.
    with patch("app.services.pdf_forensics.PdfReader") as mock_pdf_reader:
        mock_instance = mock_pdf_reader.return_value
        mock_instance.metadata = {"/Producer": "Microsoft: Print To PDF", "/CreationDate": "D:20231010120000Z", "/ModDate": "D:20231010120000Z"}
        mock_instance.resolved_objects = {1: "obj"} # Minimal objects
        
        # We need a dummy file
        pdf_path = tmp_path / "clean.pdf"
        pdf_path.write_bytes(b"%PDF-1.4\n%%EOF")
        
        score, flags = check_pdf_structure_and_metadata(str(pdf_path))
        
        assert score == 100.0
        assert len(flags) == 0

def test_pdf_structure_suspicious_producer(tmp_path):
    """Test PDF that was produced or modified by known online editors."""
    with patch("app.services.pdf_forensics.PdfReader") as mock_pdf_reader:
        mock_instance = mock_pdf_reader.return_value
        mock_instance.metadata = {"/Producer": "iLovePDF", "/Creator": "Smallpdf"}
        
        pdf_path = tmp_path / "suspicious.pdf"
        pdf_path.write_bytes(b"%PDF-1.4\n%%EOF")
        
        score, flags = check_pdf_structure_and_metadata(str(pdf_path))
        
        assert score < 100.0
        assert any("ilovepdf" in flag.lower() for flag in flags)

def test_pdf_structure_date_mismatch(tmp_path):
    """Test PDF where modification date is different from creation date."""
    with patch("app.services.pdf_forensics.PdfReader") as mock_pdf_reader:
        mock_instance = mock_pdf_reader.return_value
        mock_instance.metadata = {"/CreationDate": "D:20201010120000Z", "/ModDate": "D:20231010120000Z"}
        
        pdf_path = tmp_path / "date_mismatch.pdf"
        pdf_path.write_bytes(b"%PDF-1.4\n%%EOF")
        
        score, flags = check_pdf_structure_and_metadata(str(pdf_path))
        
        assert score < 100.0
        assert any("date mismatch" in flag.lower() for flag in flags)
