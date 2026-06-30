import httpx, json

with open("malicious_test_doc.pdf", "rb") as f:
    files = {"file": f}
    data = {"source": "Digital Upload", "document_category": "General", "is_signed": "false"}
    
    try:
        r = httpx.post("http://localhost:8000/upload", files=files, data=data, timeout=120.0)
        print("Status code:", r.status_code)
        print("Response:", json.dumps(r.json(), indent=2))
    except Exception as e:
        print("Error:", e)
