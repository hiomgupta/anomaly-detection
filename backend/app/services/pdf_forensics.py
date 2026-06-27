import os
from PyPDF2 import PdfReader

def run_pdf_forensics(pdf_path: str) -> tuple[float, list[str]]:
    """
    Analyze PDF for multiple %%EOF markers and handle flattened/scanned PDFs.
    Returns a score (0 to 100) and a list of flags.
    """
    flags = []
    score = 100.0

    try:
        if not os.path.exists(pdf_path):
            return 100.0, ["File not found"]

        # Check for flattened/scanned PDF by looking for text content
        # Scans converted to PDF usually have zero text on the first page
        is_flattened = False
        try:
            reader = PdfReader(pdf_path)
            if len(reader.pages) > 0:
                first_page_text = reader.pages[0].extract_text()
                if not first_page_text or len(first_page_text.strip()) < 10:
                    is_flattened = True
        except Exception:
            is_flattened = True # If PyPDF2 fails to read, assume flattened/corrupt

        if is_flattened:
            flags.append("Not Applicable (Flattened PDF/Scan)")
            return 100.0, flags # Skip digital metadata checks

        # Perform digital metadata checks (%%EOF markers)
        with open(pdf_path, 'rb') as f:
            content = f.read()
            
        eof_count = content.count(b'%%EOF')
        
        if eof_count > 1:
            flags.append(f"Multiple ({eof_count}) %%EOF markers detected - Potential tampering")
            score = 0.0 # Highly indicative of PDF modification/tampering
            
        return score, flags
    except Exception as e:
        return 100.0, ["PDF parsing failed - Not Applicable"]
