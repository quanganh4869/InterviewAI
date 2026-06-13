import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr_service import ocr_service

router = APIRouter()
log = logging.getLogger(__name__)

@router.post("/")
async def extract_text(file: UploadFile = File(...)):
    """
    Stand-alone extraction endpoint for OCR/PDF processing.
    """
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        if filename.endswith(".pdf"):
            text = ocr_service.extract_text_from_pdf(content)
        elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
            text = ocr_service.extract_text_from_image(content)
        else:
            # Try plain text decode
            try:
                text = content.decode("utf-8")
            except:
                raise HTTPException(status_code=400, detail="Unsupported file format.")

        if not text:
            raise HTTPException(status_code=400, detail="Could not extract any text from the file.")

        return {
            "filename": file.filename,
            "text": text,
            "length": len(text)
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        log.error(f"Extraction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
