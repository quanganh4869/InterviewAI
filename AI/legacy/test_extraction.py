import fitz
import pytesseract
import os
from PIL import Image, ImageEnhance, ImageOps
import io
import sys

# Set encoding for Windows terminal
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# Test Tesseract Configuration
TESS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESS_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESS_PATH
    print(f"Tesseract path verified: {TESS_PATH}")
else:
    print(f"Tesseract path NOT found: {TESS_PATH}")

def test_ocr_logic():
    print("\n--- Testing OCR Logic ---")
    # Create a dummy image with some text
    img = Image.new('RGB', (200, 50), color = (255, 255, 255))
    from PIL import ImageDraw
    d = ImageDraw.Draw(img)
    d.text((10,10), "Test Text 123", fill=(0,0,0))
    
    # Preprocessing
    img = img.convert("L")
    img = ImageOps.autocontrast(img)
    w, h = img.size
    img = img.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
    img = ImageEnhance.Sharpness(img).enhance(2.0)
    
    try:
        # Just use eng for basic test
        text = pytesseract.image_to_string(img, lang="eng", config="--psm 3").strip()
        print(f"OCR Output: '{text}'")
        print("OCR seems to be working.")
    except Exception as e:
        print(f"OCR Failed: {e}")

if __name__ == "__main__":
    test_ocr_logic()
