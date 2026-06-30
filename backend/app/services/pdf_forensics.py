import os

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

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
            
    except Exception as e:
        import logging
        logging.error(f"PDF metadata extraction failed: {e}")
        flags.append("Failed to extract digital metadata (potentially corrupted)")
        score -= 10.0
        
    return max(0.0, score), flags

def check_pdf_deep_structure(pdf_path: str) -> tuple[float, list[str]]:
    flags = []
    score = 100.0
    
    if fitz is None:
        return score, flags
        
    try:
        doc = fitz.open(pdf_path)
        
        # Check for overlapping text (hidden text forgery)
        overlapping_text_found = False
        for page_num in range(min(5, len(doc))):
            page = doc.load_page(page_num)
            text_blocks = page.get_text("blocks")
            
            # Simple overlap check: comparing text block bounding boxes
            for i, b1 in enumerate(text_blocks):
                # A text block in PyMuPDF: (x0, y0, x1, y1, "text", block_no, block_type)
                if len(b1) < 7 or b1[6] != 0: # Only check text blocks (type 0)
                    continue
                    
                rect1 = fitz.Rect(b1[:4])
                for j, b2 in enumerate(text_blocks):
                    if i >= j or len(b2) < 7 or b2[6] != 0:
                        continue
                    rect2 = fitz.Rect(b2[:4])
                    
                    intersect = rect1.intersect(rect2)
                    if not intersect.is_empty:
                        area1 = rect1.get_area()
                        area2 = rect2.get_area()
                        min_area = min(area1, area2)
                        
                        # If more than 50% of the smaller block is covered, it's highly suspicious
                        if min_area > 0 and intersect.get_area() / min_area > 0.5:
                            overlapping_text_found = True
                            break
                if overlapping_text_found:
                    break
            if overlapping_text_found:
                break
                
        if overlapping_text_found:
            flags.append("Deep Structure: Detected overlapping or hidden text blocks (Potential forgery)")
            score -= 40.0
            
        # Check for malicious elements (JS, URIs)
        has_suspicious_uri = False
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            links = page.get_links()
            for link in links:
                if link.get("kind") == fitz.LINK_URI:
                    uri = link.get("uri", "").lower()
                    if uri.startswith("javascript:") or ".exe" in uri or ".scr" in uri:
                        has_suspicious_uri = True
                        break
            if has_suspicious_uri:
                break
                
        if has_suspicious_uri:
            flags.append("Deep Structure: Detected malicious URI/JavaScript links")
            score -= 50.0

        doc.close()
    except Exception as e:
        import logging
        logging.error(f"PyMuPDF deep structure analysis failed: {e}")
        
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
        # Scans converted to PDF usually have zero text on the first pages
        is_flattened = True
        pypdf_failed = False
        try:
            reader = PdfReader(pdf_path)
            for i in range(min(3, len(reader.pages))):
                page_text = reader.pages[i].extract_text()
                if page_text and len(page_text.strip()) >= 10:
                    is_flattened = False
                    break
        except Exception as e:
            import logging
            logging.error(f"PyPDF2 failed to read text: {e}")
            pypdf_failed = True

        if pypdf_failed:
            flags.append("PDF Parsing Error (Potential Corruption or Tampering to Evade Scanners)")
            score = max(0.0, score - 30.0)

        # Perform digital metadata checks (%%EOF markers) using raw bytes
        with open(pdf_path, 'rb') as f:
            content = f.read()
            
        eof_count = content.count(b'%%EOF')
        if eof_count > 1:
            is_signed = b'/Sig' in content or b'adbe.pkcs7' in content
            if is_signed:
                flags.append(f"Multiple ({eof_count}) %%EOF markers detected, but digital signature found (likely valid)")
            else:
                flags.append(f"Multiple ({eof_count}) %%EOF markers detected - Potential tampering or incremental update")
                score = max(0.0, score - 20.0)

        # Run advanced structure/metadata checks ONLY if it's a readable digital PDF
        if not is_flattened and not pypdf_failed:
            meta_score, meta_flags = check_pdf_structure_and_metadata(pdf_path)
            flags.extend(meta_flags)
            score -= (100.0 - meta_score)
        elif is_flattened and not pypdf_failed:
            flags.append("No searchable text found (Flattened PDF/Scan) - Metadata analysis skipped")
        
        # Run deep PyMuPDF structural checks (fitz handles corrupted PDFs better)
        deep_score, deep_flags = check_pdf_deep_structure(pdf_path)
        flags.extend(deep_flags)
        score -= (100.0 - deep_score)
        
        return max(0.0, score), flags
    except Exception as e:
        import logging
        logging.error(f"PDF parsing failed: {e}")
        return 50.0, [f"PDF parsing failed - Inconclusive ({str(e)})"]
