import fitz
import os

def create_malicious_pdf():
    doc = fitz.open()
    page = doc.new_page()

    # 1. Overlapping text (Triggers Deep Structure overlapping check)
    page.insert_text((50, 50), "Original Legitimate Text", fontsize=12)
    page.insert_text((50, 50), "Forged Hidden Text", fontsize=12, color=(1, 1, 1)) # White text over same spot

    # 2. Malicious URI link (Triggers Deep Structure malicious URI check)
    rect = fitz.Rect(100, 100, 300, 120)
    page.insert_text((100, 115), "Click here for more info", fontsize=12, color=(0, 0, 1))
    page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": "javascript:alert('malicious')"})

    # 3. Suspicious Metadata (Triggers PDF editor and date mismatch checks)
    doc.set_metadata({
        "producer": "iLovePDF",
        "creator": "smallpdf",
        "creationDate": "D:20230101000000Z",
        "modDate": "D:20260630000000Z"
    })

    output_path = "malicious_test_doc.pdf"
    doc.save(output_path)
    doc.close()

    # 4. Multiple %%EOF markers (Triggers incremental update tampering check)
    with open(output_path, "ab") as f:
        # Appending extra EOF markers simulates a tampered/incrementally updated PDF
        f.write(b"\n%%EOF\n")
        f.write(b"1 0 obj\n<</Type/Catalog>>\nendobj\n%%EOF\n")

    print(f"Generated malicious test file: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    create_malicious_pdf()
