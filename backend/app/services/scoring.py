def generate_final_score(ela_score: float, edge_score: float, copy_move_score: float, pdf_score: float, ocr_score: float, is_hard_copy: bool) -> float:
    """
    Calculates a weighted ensemble fraud confidence score (0 to 100).
    A score of 100 means the document is entirely genuine/clean.
    A score of 0 means the document is highly fraudulent.
    
    Weighting differs based on the source (Hard Copy vs Digital).
    """
    if is_hard_copy:
        # Hard Copies are physical scans. ELA and PDF checks are less relevant,
        # but OCR logic and Edge Detection are very important.
        weights = {
            'ela': 0.10,    # 10%
            'edge': 0.20,   # 20%
            'copy_move': 0.20, # 20%
            'pdf': 0.00,    # 0%
            'ocr': 0.50     # 50%
        }
    else:
        # Digital Uploads are native PDFs or digitally manipulated images.
        weights = {
            'ela': 0.20,    # 20%
            'edge': 0.00,   # 0%
            'copy_move': 0.20, # 20%
            'pdf': 0.30,    # 30%
            'ocr': 0.30     # 30%
        }
        
    final_score = (
        ela_score * weights['ela'] +
        edge_score * weights['edge'] +
        copy_move_score * weights['copy_move'] +
        pdf_score * weights['pdf'] +
        ocr_score * weights['ocr']
    )
    
    # Ensure precision and bounds
    return round(max(0.0, min(100.0, final_score)), 2)
