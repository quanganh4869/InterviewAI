import io
import logging
import fitz
import pytesseract
from PIL import Image, ImageEnhance, ImageOps
from app.core.config import settings

log = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        if settings.has_tesseract:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
            self.enabled = True
        else:
            log.warning("Tesseract OCR not found. OCR features will be limited.")
            self.enabled = False

    def _preprocess_image(self, pix: fitz.Pixmap) -> Image.Image:
        """Preprocessing pipeline optimized for Vietnamese text."""
        # Convert fitz Pixmap to PIL Image (Grayscale)
        if pix.alpha or (pix.colorspace and pix.colorspace.n > 3):
            pix = fitz.Pixmap(fitz.csRGB, pix)
        
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")
        
        # 1. Autocontrast
        img = ImageOps.autocontrast(img)
        
        # 2. Upscaling (400 DPI equivalent)
        w, h = img.size
        img = img.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
        
        # 3. Sharpness and Contrast enhancement
        img = ImageEnhance.Sharpness(img).enhance(2.0)
        img = ImageEnhance.Contrast(img).enhance(1.5)
        
        return img

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_content = ""
        for page in doc:
            # Try native text extraction first
            native = page.get_text("text").strip()
            if native:
                text_content += native + "\n"
            elif self.enabled:
                # Fallback to OCR for scanned pages
                zoom = 400 / 72
                pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
                img = self._preprocess_image(pix)
                text_content += pytesseract.image_to_string(img, lang="vie+eng", 
                config="--psm 3") + "\n"
        doc.close()
        return text_content.strip()

    def extract_text_from_image(self, image_bytes: bytes) -> str:
        if not self.enabled:
            return "OCR disabled (Tesseract not found)."
        
        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Basic OCR for single image
            return pytesseract.image_to_string(img, lang="vie+eng", config="--psm 3").strip()
        except Exception as e:
            log.error(f"Image OCR Error: {e}")
            return ""

ocr_service = OCRService()
