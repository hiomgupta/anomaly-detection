import urllib.request
import urllib.parse
import json
import mimetypes
import uuid
import os

def post_multipart(url, fields, files):
    boundary = uuid.uuid4().hex
    body = []
    
    for key, value in fields.items():
        body.append(f"--{boundary}")
        body.append(f"Content-Disposition: form-data; name=\"{key}\"")
        body.append("")
        body.append(str(value))
        
    for key, filename, value in files:
        body.append(f"--{boundary}")
        body.append(f"Content-Disposition: form-data; name=\"{key}\"; filename=\"{filename}\"")
        body.append(f"Content-Type: image/jpeg")
        body.append("")
        body.append(value)
        
    body.append(f"--{boundary}--")
    body.append("")
    
    body = "\r\n".join(body).encode('utf-8')
    
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        response = urllib.request.urlopen(req, timeout=30)
        return response.read().decode('utf-8')
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    fields = {
        "source": "Digital Upload",
        "document_category": "General",
        "is_signed": "false"
    }
    # Create valid fake jpeg
    with open("test.jpg", "wb") as f:
        f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xd9")
    
    files = [
        ("file", "test.jpg", open("test.jpg", "rb").read().decode("latin-1"))
    ]
    
    print("Testing upload endpoint...")
    result = post_multipart("http://localhost:8000/upload", fields, files)
    print("Result:")
    print(result)
