import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.matcher_service import matcher_service
from app.services.ocr_service import ocr_service
from app.services.vector_db_service import vector_db_service

router = APIRouter()
log = logging.getLogger(__name__)

@router.post("/match")
async def match_cv_jd(
    cv_text: Optional[str] = Form(None),
    jd_text: Optional[str] = Form(None),
    cv_file: Optional[UploadFile] = File(None),
    jd_file: Optional[UploadFile] = File(None)
):
    """
    Match a CV against a Job Description. 
    Supports both raw text and file uploads (PDF, Images).
    """
    try:
        # Extract text from files if provided
        final_cv_text = cv_text or ""
        if cv_file:
            content = await cv_file.read()
            if cv_file.filename.lower().endswith(".pdf"):
                final_cv_text = ocr_service.extract_text_from_pdf(content)
            else:
                final_cv_text = ocr_service.extract_text_from_image(content)

        final_jd_text = jd_text or ""
        if jd_file:
            content = await jd_file.read()
            if jd_file.filename.lower().endswith(".pdf"):
                final_jd_text = ocr_service.extract_text_from_pdf(content)
            else:
                final_jd_text = ocr_service.extract_text_from_image(content)

        if not final_cv_text or not final_jd_text:
            raise HTTPException(
                status_code=400, 
                detail="Both CV and JD content are required (text or file)."
            )

        # Persistence: Save CV to Vector DB for future semantic searches
        cv_id = cv_file.filename if cv_file else "manual_upload"
        vector_db_service.upsert_cv(cv_id, final_cv_text, {"type": "cv_upload"})

        result = await matcher_service.calculate_match(final_cv_text, final_jd_text)
        
        # Add previews
        result["previews"] = {
            "cv": final_cv_text[:1000] + "...",
            "jd": final_jd_text[:1000] + "..."
        }
        
        return result

    except Exception as e:
        log.error(f"Matching Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
