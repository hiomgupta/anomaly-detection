import os
import tempfile

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

def run_ela(image_path: str, quality: int = 95) -> float:
    """
    Error Level Analysis to detect JPEG compression artifacts.
    """
    if cv2 is None or np is None:
        return 0.0

    try:
        original = cv2.imread(image_path)
        if original is None:
            return 0.0

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            temp_path = tmp.name
        
        cv2.imwrite(temp_path, original, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        resaved = cv2.imread(temp_path)
        os.remove(temp_path)

        if resaved is None:
            return 0.0

        ela = cv2.absdiff(original, resaved)
        ela = cv2.convertScaleAbs(ela)
        
        gray_ela = cv2.cvtColor(ela, cv2.COLOR_BGR2GRAY)
        _, threshold = cv2.threshold(gray_ela, 30, 255, cv2.THRESH_BINARY)
        
        score = (np.sum(threshold > 0) / threshold.size) * 100
        return float(score)
    except Exception:
        # Gracefully handle corrupted images
        return 0.0

def run_edge_detection(image_path: str) -> tuple[float, list[str]]:
    """
    OpenCV edge detection looking for sharp, unnatural rectangular shadows (glued photos).
    Handles low contrast gracefully.
    """
    flags = []
    score = 100.0  # 100 means no unnatural edges found

    if cv2 is None or np is None:
        return score, ["Image forensics unavailable: OpenCV/NumPy dependencies are not installed"]
    
    try:
        image = cv2.imread(image_path)
        if image is None:
            return 100.0, ["Image could not be read for edge detection"]

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Handle extremely low contrast by equalizing histogram
        if gray.std() < 10:
            gray = cv2.equalizeHist(gray)
            
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Canny edge detection
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours to detect unnatural rectangular shapes
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        unnatural_rects = 0
        for cnt in contours:
            approx = cv2.approxPolyDP(cnt, 0.02 * cv2.arcLength(cnt, True), True)
            if len(approx) == 4:
                area = cv2.contourArea(cnt)
                if area > 1000:  # Arbitrary threshold to ignore small noise
                    x, y, w, h = cv2.boundingRect(approx)
                    aspect_ratio = float(w) / h
                    # Sharp rectangular shadows often have regular aspect ratios
                    if 0.5 <= aspect_ratio <= 2.0:
                        unnatural_rects += 1

        if unnatural_rects > 0:
            flags.append(f"Detected {unnatural_rects} unnatural rectangular edges (possible glued photo or crop)")
            score -= (unnatural_rects * 20.0) # Deduct 20 points per unnatural rectangle
            
        return max(0.0, score), flags
    except Exception as e:
        return 100.0, ["Edge detection failed due to image format or corruption"]

def analyze_image_forensics(image_path: str) -> tuple[float, float, list[str]]:
    """
    Runs all image forensics tools and returns their scores and flags.
    """
    ela_score = run_ela(image_path)
    ela_flags = ["High ELA anomaly detected"] if ela_score > 5.0 else []
    
    edge_score, edge_flags = run_edge_detection(image_path)
    
    # ela_score is a percentage of anomalous pixels (0 is good, high is bad).
    # Convert ela_score so 100 is good and 0 is bad for consistency.
    normalized_ela_score = max(0.0, 100.0 - (ela_score * 10))
    
    return normalized_ela_score, edge_score, ela_flags + edge_flags
