def generate_final_score(
    ela_score: float, 
    edge_score: float, 
    copy_move_score: float, 
    pdf_score: float, 
    ocr_score: float, 
    is_hard_copy: bool,
    signature_score: float = None,
    document_category: str = "General"
) -> float:
    """
    Calculates a weighted ensemble fraud confidence score (0 to 100).
    A score of 100 means the document is entirely genuine/clean.
    """
    if is_hard_copy:
        weights = {
            'ela': 0.10,
            'edge': 0.20,
            'copy_move': 0.20,
            'pdf': 0.00,
            'ocr': 0.50,
            'signature': 0.00
        }
    else:
        weights = {
            'ela': 0.20,
            'edge': 0.00,
            'copy_move': 0.20,
            'pdf': 0.30,
            'ocr': 0.30,
            'signature': 0.00
        }
        
    # Adjust weights based on specific categories
    if document_category in ["Cheque", "AOD Doc", "Agreement"]:
        if signature_score is not None:
            weights['signature'] = 0.30
            weights['ocr'] -= 0.15
            weights['copy_move'] -= 0.15
            
    elif document_category in ["PAN/Aadhaar"]:
        weights['edge'] += 0.20  # Important for superimposition
        weights['ocr'] -= 0.10
        weights['ela'] -= 0.10

    # Ensure signature gets factored in if present and not handled above
    if signature_score is not None and weights['signature'] == 0:
        weights['signature'] = 0.15
        weights['ocr'] -= 0.15

    final_score = (
        ela_score * weights['ela'] +
        edge_score * weights['edge'] +
        copy_move_score * weights['copy_move'] +
        pdf_score * weights['pdf'] +
        ocr_score * weights['ocr']
    )
    
    if signature_score is not None:
        final_score += signature_score * weights['signature']
        
    return round(max(0.0, min(100.0, final_score)), 2)
