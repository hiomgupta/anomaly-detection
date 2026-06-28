import os
from PIL import Image
from PIL.ExifTags import TAGS

def analyze_image_metadata(image_path: str) -> tuple[float, list[str]]:
    """
    Extract EXIF data and analyze it for common tampering signs.
    """
    flags = []
    score = 100.0

    try:
        with Image.open(image_path) as img:
            exif_data = img.getexif()
            if not exif_data:
                return score, flags
            
            exif = {
                TAGS.get(k, k): v
                for k, v in exif_data.items()
            }
            
            exif_ifd = exif_data.get_ifd(0x8769)
            exif_sub = {
                TAGS.get(k, k): v
                for k, v in exif_ifd.items()
            }

            
            # Check for suspicious software signatures
            software = str(exif.get('Software', '')).lower()
            if 'photoshop' in software or 'ilovepdf' in software or 'gimp' in software or 'canva' in software:
                flags.append(f"Editing software detected in EXIF: {exif.get('Software')}")
                score -= 30.0
                
            # Check for Date Mismatches
            # If DateTimeOriginal exists, it should match DateTime
            date_original = str(exif_sub.get('DateTimeOriginal', ''))
            date_modified = str(exif.get('DateTime', ''))
            
            if date_original and date_modified and date_original != date_modified:
                flags.append(f"Date Mismatch: Original ({date_original}) != Modified ({date_modified})")
                score -= 20.0
                
    except Exception as e:
        # Gracefully handle images with corrupted or unreadable metadata
        pass
        
    return max(0.0, score), flags
