"""
anomaly_scorer.py — Production-grade anomaly scoring layer.

Wraps scikit-learn's IsolationForest to:
  1. Train lazily on existing verified documents from the DB.
  2. Score new uploads against the learned distribution of genuine docs.
  3. Generate SHAP-style reason codes explaining which features drove the anomaly.

ponytail: IsolationForest is trained in-process and pickled to disk. For high volume,
          replace with a scheduled retraining job. Ceiling: ~10k docs/sec on a single core.
"""
import os
import json
import pickle
import logging
import hashlib
from typing import Optional

logger = logging.getLogger(__name__)

# Feature order must stay stable across train and inference
FEATURES = ["ela", "edge", "copy_move", "pdf", "ocr", "metadata"]
MODEL_PATH = os.path.join(os.path.dirname(__file__), "isolation_forest.pkl")
MIN_TRAINING_SAMPLES = 10  # Don't train until we have enough genuine docs


def _scores_to_vector(scores: dict) -> list:
    """Convert a scores dict to a consistent feature vector."""
    return [float(scores.get(f, 100.0)) for f in FEATURES]


def train_model(db) -> bool:
    """
    Train an IsolationForest on verified (genuine) documents from the DB.
    Returns True if training succeeded, False if not enough data.
    """
    try:
        from sklearn.ensemble import IsolationForest
    except ImportError:
        logger.warning("scikit-learn not installed. Anomaly scoring unavailable.")
        return False

    from ..models.document import DocumentRecord

    # Only train on documents humans have confirmed genuine
    verified_docs = (
        db.query(DocumentRecord)
        .filter(DocumentRecord.status.in_(["verified", "verified_override"]))
        .filter(DocumentRecord.scores.isnot(None))
        .all()
    )

    if len(verified_docs) < MIN_TRAINING_SAMPLES:
        logger.info(
            f"Not enough verified documents to train ({len(verified_docs)}/{MIN_TRAINING_SAMPLES}). Skipping."
        )
        return False

    X = []
    for doc in verified_docs:
        try:
            scores = json.loads(doc.scores)
            X.append(_scores_to_vector(scores))
        except Exception:
            continue

    if len(X) < MIN_TRAINING_SAMPLES:
        return False

    from sklearn.ensemble import IsolationForest
    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    model.fit(X)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    logger.info(f"IsolationForest trained on {len(X)} verified documents.")
    return True


def _load_model():
    """Load the trained model from disk, or return None if not available."""
    if not os.path.exists(MODEL_PATH):
        return None
    try:
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        logger.error(f"Failed to load anomaly model: {e}")
        return None


def score_anomaly(scores: dict) -> tuple:
    """
    Score a document using the trained IsolationForest.

    Returns:
        (anomaly_score, reason_codes)
        anomaly_score: 0.0 (very anomalous) to 100.0 (very normal). None if model not trained.
        reason_codes: List of human-readable strings explaining the top risk factors.
    """
    model = _load_model()
    reason_codes = _generate_reason_codes(scores)

    if model is None:
        return None, reason_codes

    try:
        vector = [_scores_to_vector(scores)]
        # decision_function returns negative = anomalous, positive = normal
        raw = model.decision_function(vector)[0]
        # Normalize: typical range is roughly [-0.5, 0.5] -> scale to [0, 100]
        normalized = max(0.0, min(100.0, (raw + 0.5) * 100.0))
        return round(normalized, 2), reason_codes
    except Exception as e:
        logger.error(f"Anomaly scoring failed: {e}")
        return None, reason_codes


def _described(deviation: float) -> str:
    if deviation >= 50:
        return f"-{deviation:.0f}pts, critical deviation from baseline"
    if deviation >= 20:
        return f"-{deviation:.0f}pts, significant deviation from baseline"
    return f"-{deviation:.0f}pts, minor deviation from baseline"


def _generate_reason_codes(scores: dict) -> list:
    """
    SHAP-style reason codes: explain which feature scores are most anomalous
    relative to the expected baseline of 100.

    ponytail: This is a simplified deviation-from-baseline approach.
              For true SHAP, replace with shap.TreeExplainer after training.
    """
    LABELS = {
        "ela": "ELA (Pixel Compression Anomaly)",
        "edge": "Edge Detection (Superimposition)",
        "copy_move": "Copy-Move Forgery",
        "pdf": "PDF Structural Integrity",
        "ocr": "OCR & Logic Consistency",
        "metadata": "EXIF Metadata Integrity",
    }
    THRESHOLDS = [
        (80, "HIGH RISK"),
        (90, "MEDIUM RISK"),
        (95, "LOW RISK"),
    ]

    reasons = []
    deviations = {f: 100.0 - float(scores.get(f, 100.0)) for f in FEATURES}
    sorted_features = sorted(deviations.items(), key=lambda x: x[1], reverse=True)

    for feature, deviation in sorted_features:
        score_val = scores.get(feature)
        if score_val is None or deviation < 5:
            continue
        label = LABELS.get(feature, feature)
        for threshold, risk_label in THRESHOLDS:
            if score_val < threshold:
                reasons.append(
                    f"{risk_label} - {label}: {score_val:.1f}/100 ({_described(deviation)})"
                )
                break

    return reasons


def compute_file_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 fingerprint of file content."""
    return hashlib.sha256(file_bytes).hexdigest()
