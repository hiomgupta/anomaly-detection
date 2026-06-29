import requests

url = "http://localhost:8000/upload"
data = {
    "source": "Digital Upload",
    "document_category": "General",
    "is_signed": "false"
}

# Create a dummy image file
with open("test.jpg", "wb") as f:
    f.write(b"fake image data")

files = {
    "file": ("test.jpg", open("test.jpg", "rb"), "image/jpeg")
}

try:
    print("Sending request...")
    response = requests.post(url, data=data, files=files, timeout=30)
    print(response.status_code)
    print(response.json())
except Exception as e:
    print("Error:", e)
