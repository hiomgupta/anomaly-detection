import os

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

def check_pdf_structure_and_metadata(pdf_path: str) -> tuple[float, list[str]]:
    flags = []
    score = 100.0
    
    if PdfReader is None:
        return score, flags

    try:
        reader = PdfReader(pdf_path)
        metadata = reader.metadata
        if not metadata:
            return score, flags
            
        # Check suspicious Producer/Creator
        producer = str(metadata.get('/Producer', '')).lower()
        creator = str(metadata.get('/Creator', '')).lower()
        
        suspicious_keywords = ['ilovepdf', 'smallpdf', 'pdfescape', 'sejda']
        if any(keyword in producer or keyword in creator for keyword in suspicious_keywords):
            flags.append(f"Suspicious PDF Editor detected: {metadata.get('/Producer') or metadata.get('/Creator')}")
            score -= 30.0
            
        # Check date mismatch
        c_date = str(metadata.get('/CreationDate', ''))
        m_date = str(metadata.get('/ModDate', ''))
        
        if c_date and m_date and c_date != m_date:
            flags.append(f"Date Mismatch: Creation ({c_date}) != Modification ({m_date})")
            score -= 20.0
            
    except Exception:
        pass
        
    return max(0.0, score), flags

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

        if PdfReader is None:
            return 100.0, ["PDF forensics unavailable: PyPDF2 dependency is not installed"]

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
            
        # Run advanced structure/metadata checks
        meta_score, meta_flags = check_pdf_structure_and_metadata(pdf_path)
        flags.extend(meta_flags)
        # Apply the metadata penalty to the overall score (but don't go below 0)
        score = max(0.0, score - (100.0 - meta_score))
            
        return score, flags
    except Exception as e:
        return 100.0, ["PDF parsing failed - Not Applicable"]
