import re
from datetime import datetime
import dateutil.parser

try:
    import easyocr
except (ImportError, OSError):
    easyocr = None

reader = None

def get_reader():
    """Lazy-load EasyOCR so the API can start before the OCR model is needed."""
    global reader
    if easyocr is None:
        return None
    if reader is None:
        reader = easyocr.Reader(['en'], gpu=False)
    return reader

def extract_amount(text: str) -> float:
    """Helper to parse currency values like '45,000.00', '45000', or '₹ 45,000' to float."""
    # Strip common currency symbols before matching
    cleaned_text = re.sub(r'[₹$€£]|rs\.?|inr\b', '', text.lower()).strip()
    match = re.search(r'\b\d{1,2}(?:,\d{2})*(?:,\d{3})*(?:\.\d+)?\b|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b', cleaned_text)
    if match:
        num_str = match.group(0).replace(',', '')
        try:
            return float(num_str)
        except ValueError:
            return None
    return None

def extract_date(text: str) -> datetime:
    """Helper to parse dates using dateutil."""
    try:
        # Simplistic regex to find potential dates (e.g. 2023-01-01, 12/05/2021, Jan 5, 2022)
        match = re.search(r'\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b', text, re.IGNORECASE)
        if match:
            return dateutil.parser.parse(match.group(0), fuzzy=True)
    except Exception:
        pass
    return None

def run_ocr_analysis(image_path: str) -> tuple[float, list[str]]:
    """
    Run OCR on image and perform consistency checks.
    """
    flags = []
    score = 100.0
    
    try:
        ocr_reader = get_reader()
        if ocr_reader is None:
            return 100.0, ["OCR unavailable: EasyOCR dependency is not installed"]

        results = ocr_reader.readtext(image_path)
        
        if not results:
            return 50.0, ["Low Confidence OCR: No text found"]
            
        text_blocks = []
        total_confidence = 0.0
        
        for bbox, text, conf in results:
            text_blocks.append(text)
            total_confidence += conf
            
        avg_confidence = total_confidence / len(results) if results else 0
        
        if avg_confidence < 0.3:
            return 50.0, [f"Low Confidence OCR: Text is unreadable or blurry (Conf: {avg_confidence:.2f})"]
            
        full_text = " ".join(text_blocks).lower()

        # Math Consistency Check: Gross = Net + Deductions
        gross = None
        net = None
        deductions = None
        
        found_gross = False
        found_net = False
        found_deductions = False
        
        for idx, text in enumerate(text_blocks):
            t_lower = text.lower()
            if 'gross' in t_lower:
                found_gross = True
                # Look at next few blocks for the amount
                for j in range(1, 8):
                    if idx + j < len(text_blocks):
                        amt = extract_amount(text_blocks[idx + j])
                        if amt is not None:
                            gross = amt
                            break
            if 'net' in t_lower and 'weight' not in t_lower:
                found_net = True
                for j in range(1, 8):
                    if idx + j < len(text_blocks):
                        amt = extract_amount(text_blocks[idx + j])
                        if amt is not None:
                            net = amt
                            break
            if 'deduction' in t_lower:
                found_deductions = True
                for j in range(1, 8):
                    if idx + j < len(text_blocks):
                        amt = extract_amount(text_blocks[idx + j])
                        if amt is not None:
                            deductions = amt
                            break

        if found_gross or found_net or found_deductions:
            if gross is not None and net is not None and deductions is not None:
                if abs(gross - (net + deductions)) > 0.01:
                    flags.append(f"Math Inconsistency: Net ({net}) + Deductions ({deductions}) != Gross ({gross})")
                    score -= 30.0
            else:
                missing = []
                if found_gross and gross is None: missing.append("Gross")
                if found_net and net is None: missing.append("Net")
                if found_deductions and deductions is None: missing.append("Deductions")
                if missing:
                    flags.append(f"Missing Math Components: Found labels for {', '.join(missing)} but no nearby amounts")
                    score -= 10.0

        # Chronology Check
        issue_date = None
        incorp_date = None
        
        for idx, text in enumerate(text_blocks):
            t_lower = text.lower()
            if 'issue date' in t_lower:
                for j in range(1, 4):
                    if idx + j < len(text_blocks):
                        dt = extract_date(text_blocks[idx + j])
                        if dt:
                            issue_date = dt
                            break
            if 'incorporation date' in t_lower or 'incorp date' in t_lower:
                for j in range(1, 4):
                    if idx + j < len(text_blocks):
                        dt = extract_date(text_blocks[idx + j])
                        if dt:
                            incorp_date = dt
                            break
                            
        if issue_date and incorp_date:
            if issue_date < incorp_date:
                flags.append(f"Chronology Inconsistency: Issue Date ({issue_date.date()}) precedes Incorporation Date ({incorp_date.date()})")
                score -= 40.0

        return max(0.0, score), flags

    except Exception as e:
        import logging
        logging.error(f"OCR analysis failed: {e}")
        return 50.0, [f"Low Confidence OCR: Extraction failed unexpectedly ({str(e)})"]
