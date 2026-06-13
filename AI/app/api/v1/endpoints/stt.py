import logging
import shutil
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.whisper_service import whisper_service

router = APIRouter()
log = logging.getLogger(__name__)

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe audio file to text using Faster-Whisper.
    """
    if not (file.content_type.startswith("audio/") or file.content_type.startswith("video/")):
        # Some browsers might send generic types, so we also check extension
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["mp3", "wav", "m4a", "ogg", "flac", "webm", "mp4"]:
            raise HTTPException(status_code=400, detail="Only audio and video container files are supported.")

    temp_path = None
    try:
        # Create a temporary file to save the upload
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_path = tmp.name

        result = await whisper_service.transcribe(temp_path)
        return result

    except Exception as e:
        log.error(f"STT Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
