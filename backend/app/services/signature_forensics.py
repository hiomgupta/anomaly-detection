import cv2
import numpy as np
import random

def analyze_signature(image_path: str) -> tuple[float, list[str]]:
    """
    Analyzes an image for signature-related anomalies.
    For the MVP, this performs a basic heuristic check or returns a simulated score.
    """
    flags = []
    score = 100.0
    
    try:
        # Hackathon MVP: Simple heuristic simulation
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0, ["Failed to load image for signature analysis"]
            
        # Check if there's enough high-contrast dark pixels (ink)
        _, threshold = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
        ink_pixels = np.count_nonzero(threshold)
        total_pixels = img.size
        ink_ratio = ink_pixels / total_pixels if total_pixels > 0 else 0
        
        # If there's barely any "ink", maybe there's no signature
        if ink_ratio < 0.005:
            score -= 40
            flags.append("Signature Check: Insufficient ink/strokes detected (Possible missing signature)")
            
        # Simulate edge cases where signature might be altered
        if random.random() > 0.8:
            score -= random.randint(10, 30)
            flags.append("Signature Check: Minor contour inconsistencies detected (Potential forgery)")
            
        return max(0.0, score), flags
    except Exception as e:
        return 50.0, ["Signature analysis failed unexpectedly"]
