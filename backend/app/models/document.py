from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum
from datetime import datetime
import enum
from ..database import Base

class DocumentSource(str, enum.Enum):
    DIGITAL_UPLOAD = "Digital Upload"
    HARD_COPY = "Hard Copy"

class DocumentRecord(Base):
    __tablename__ = "document_records"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    file_hash = Column(String, index=True, nullable=True)  # SHA-256 fingerprint for tamper detection
    file_size_bytes = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    source = Column(Enum(DocumentSource), nullable=False)
    document_category = Column(String, default="General", nullable=False)
    
    fraud_score = Column(Float, nullable=True)
    anomaly_score = Column(Float, nullable=True)  # Isolation Forest anomaly score
    flags = Column(Text, nullable=True)  # Store JSON or comma-separated string
    scores = Column(Text, nullable=True) # Store JSON dictionary of individual scores
    reason_codes = Column(Text, nullable=True)  # JSON: SHAP-style top risk contributors
    
    status = Column(String, default="pending", nullable=False)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)

