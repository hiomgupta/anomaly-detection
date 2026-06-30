import os
import sys
# add app path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import DocumentRecord
from app.services.report_generator import generate_forensic_report

engine = create_engine('sqlite:///./bank_audit.db')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
doc = db.query(DocumentRecord).filter(DocumentRecord.id == 18).first()
if not doc:
    print("Doc not found")
else:
    try:
        path = generate_forensic_report(doc)
        print("Success:", path)
    except Exception as e:
        import traceback
        traceback.print_exc()
