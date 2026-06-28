import pytest
import io
import asyncio
from unittest.mock import patch
from httpx import AsyncClient
from httpx._transports.asgi import ASGITransport

from app.main import app

# --- The "Idiot User" Upload Attacks ---
# You developers always assume users will upload nice, clean 1MB PDFs. 
# They won't. They'll upload garbage. Your system needs to survive it.

def test_upload_massive_file(client):
    """
    Test uploading a 50MB file. 
    If this crashes the server with an OOM error, your architecture is garbage.
    It should reject instantly with a 400.
    """
    # Create a dummy 50MB file in memory. Yes, it's just zeroes. The size is what matters.
    large_content = b"0" * (50 * 1024 * 1024)
    file_mock = io.BytesIO(large_content)
    
    response = client.post(
        "/upload",
        data={"source": "Hard Copy", "document_category": "General", "is_signed": "false"},
        files={"file": ("massive.pdf", file_mock, "application/pdf")}
    )
    
    # I expect a 400 Bad Request, not a 500 Internal Server Error, and certainly not a success!
    assert response.status_code == 400, "Your system just tried to process a 50MB file. You're going to bankrupt us on AWS compute."
    assert "exceeds" in response.json()["detail"].lower()

def test_upload_malicious_renamed_file(client):
    """
    Test uploading an .exe disguised as a PDF.
    If you're only checking the file extension and not the magic bytes or MIME type, 
    you're basically leaving the front door open for malware.
    """
    # This is an MZ header (DOS executable), not a PDF magic number (%PDF)
    malicious_content = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00"
    file_mock = io.BytesIO(malicious_content)
    
    response = client.post(
        "/upload",
        data={"source": "Hard Copy", "document_category": "General", "is_signed": "false"},
        files={"file": ("document.pdf", file_mock, "application/pdf")}
    )
    
    # The endpoint might accept it initially if it only checks Content-Type header,
    # but the forensic services better catch it and fail gracefully.
    assert response.status_code in [200, 201, 400]
    if response.status_code in [200, 201]:
        data = response.json()
        assert data["fraud_score"] <= 100
        # It should flag the failure or return 0 for PDF score
        assert data["scores"]["pdf"] == 0.0 or any("failed" in flag.lower() for flag in data.get("flags", [])), "You analyzed an EXE file as a PDF without throwing a flag. Absolutely embarrassing."

def test_upload_zero_byte_corrupted_file(client):
    """
    Test uploading a completely empty file.
    Does your image processing library try to allocate a 0x0 matrix and divide by zero?
    """
    file_mock = io.BytesIO(b"")
    
    response = client.post(
        "/upload",
        data={"source": "Hard Copy", "document_category": "General", "is_signed": "false"},
        files={"file": ("empty.jpg", file_mock, "image/jpeg")}
    )
    
    # Should be instantly rejected as a bad request
    assert response.status_code == 400, "Why did you return a 500? Or worse, 200? The file is EMPTY!"
    assert "empty" in response.json()["detail"].lower()

# --- The SQLite Bottleneck ---
# SQLite is cute for side projects, but let's see how your 'enterprise' app handles 
# 20 concurrent async requests. Database locking is a real thing, juniors.

@pytest.mark.asyncio
async def test_concurrent_uploads_sqlite_lockup():
    """
    Fire 20 requests at the exact same time. 
    If SQLite locks up and throws an OperationalError (database is locked), 
    you're going to have a bad time in production.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        async def make_request(i):
            file_mock = io.BytesIO(b"%PDF-1.4 mock content " + str(i).encode())
            return await ac.post(
                "/upload",
                data={"source": "Digital Upload", "document_category": "General", "is_signed": "false"},
                files={"file": (f"test_{i}.pdf", file_mock, "application/pdf")}
            )

        # Fire 20 requests concurrently
        tasks = [make_request(i) for i in range(20)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        for idx, resp in enumerate(responses):
            if isinstance(resp, Exception):
                pytest.fail(f"Request {idx} failed with an exception: {resp}. Your DB probably locked up.")
            
            # If the DB locks up, SQLAlchemy might throw a 500
            assert resp.status_code in [201, 200], f"Request {idx} failed with {resp.status_code}. If this is a 500 OperationalError, I told you so."
