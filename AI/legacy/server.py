import os
import shutil
import tempfile
import traceback
from faster_whisper import WhisperModel
import torch
import fitz
import pytesseract
import base64
import io
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# --- AI Module Integration ---
from app.ai.services.jd_matcher_service import JDMatcherService
from app.ai.schemas.ai_schema import MatchRequest

# Setup Logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("server")

# --- Tesseract Configuration ---
TESS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESS_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESS_PATH
    _HAS_TESS = True
    log.info(f"Tesseract found and configured at: {TESS_PATH}")
else:
    _HAS_TESS = bool(shutil.which("tesseract"))
    if not _HAS_TESS:
        log.warning("Tesseract OCR not found! PDF scan/Image extraction will be disabled.")

app = FastAPI(title="Unified AI Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Models / Setup ---
matcher_service = JDMatcherService()

print("Loading Faster-Whisper model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "int8"
whisper_model = WhisperModel("small", device=device, compute_type=compute_type)
print(f"Faster-Whisper ready! (Device: {device}, Compute: {compute_type})")

# --- Helpers ---
def _to_rgb(pix: fitz.Pixmap) -> fitz.Pixmap:
    if pix.alpha or (pix.colorspace and pix.colorspace.n > 3):
        return fitz.Pixmap(fitz.csRGB, pix)
    return pix

def run_ocr(pix: fitz.Pixmap) -> str:
    """Robust OCR extraction with preprocessing optimized for Vietnamese."""
    if not _HAS_TESS: 
        return ""
    from PIL import Image, ImageEnhance, ImageOps
    try:
        # Convert pixmap to PIL Image
        png = _to_rgb(pix).tobytes("png")
        img = Image.open(io.BytesIO(png)).convert("L") # Grayscale
        
        # 1. Autocontrast for better character separation
        img = ImageOps.autocontrast(img)
        
        # 2. Upscaling (Double the size to make markers/accents clearer)
        w, h = img.size
        img = img.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
        
        # 3. Enhance Sharpness and Contrast
        img = ImageEnhance.Sharpness(img).enhance(2.0)
        img = ImageEnhance.Contrast(img).enhance(1.5)
        
        # OCR with Vietnamese + English and Auto Layout
        return pytesseract.image_to_string(img, lang="vie+eng", config="--psm 3").strip()
    except Exception as e: 
        log.error(f"OCR Internal Error: {e}")
        return ""

async def get_text_from_upload(file: Optional[UploadFile], default_text: Optional[str] = None) -> str:
    if default_text and default_text.strip():
        return default_text
    if not file or not file.filename:
        return ""
    try:
        data = await file.read()
        if not data: return ""
        ext = file.filename.rsplit(".", 1)[-1].lower()
        text_content = ""
        
        if ext == "pdf":
            doc = fitz.open(stream=data, filetype="pdf")
            for page in doc:
                # Try to get native text first
                native = page.get_text("text").strip()
                if native:
                    text_content += native + "\n"
                else:
                    # Scanned PDF: Use high resolution rendering (400 DPI) for OCR
                    # 400 DPI = 400/72 zoom factor
                    zoom = 400 / 72
                    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
                    text_content += run_ocr(pix) + "\n"
            doc.close()
        elif ext in ["png", "jpg", "jpeg", "webp"]:
            pix = _to_rgb(fitz.Pixmap(data))
            text_content = run_ocr(pix)
        else:
            text_content = data.decode("utf-8", errors="ignore")
            
        return text_content.strip()
    except Exception as e:
        log.error(f"Extraction Error for {file.filename}: {e}")
        return ""

# --- API Endpoints ---

@app.post("/api/extract")
async def extract_only(file: UploadFile = File(...)):
    """Standalone extraction endpoint for the OCR Dashboard."""
    text = await get_text_from_upload(file)
    if not text:
        return JSONResponse(status_code=400, content={"error": "Could not extract text from file."})
    return {"text": text, "filename": file.filename}

@app.post("/api/ai/match")
async def match_cv_jd(
    cv_text: Optional[str] = Form(None),
    jd_text: Optional[str] = Form(None),
    cv_file: Optional[UploadFile] = File(None),
    jd_file: Optional[UploadFile] = File(None)
):
    try:
        log.info("--- New Match Request ---")
        final_cv_text = await get_text_from_upload(cv_file, cv_text)
        final_jd_text = await get_text_from_upload(jd_file, jd_text)
        
        log.info(f"CV Text Length: {len(final_cv_text)}")
        log.info(f"JD Text Length: {len(final_jd_text)}")

        if not final_cv_text or not final_jd_text:
            msg = "Both CV and JD content are required (text or file)."
            if not _HAS_TESS: msg += " Note: Tesseract is missing on server, cannot read scanned files."
            raise HTTPException(status_code=400, detail=msg)
            
        result = await matcher_service.match(final_cv_text, final_jd_text)
        
        # Add previews for the UI
        result["extracted_cv"] = final_cv_text[:2000]
        result["extracted_jd"] = final_jd_text[:2000]
        
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        log.error(f"Match Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/")
async def root():
    return {"status": "AI Matcher Server Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
