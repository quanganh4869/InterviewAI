import logging
import os
from faster_whisper import WhisperModel
from app.core.config import settings

log = logging.getLogger(__name__)

class WhisperService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WhisperService, cls).__new__(cls)
            cls._instance._model = None
        return cls._instance

    @property
    def model(self):
        """Lazy load Whisper model."""
        if self._model is None:
            try:
                log.info(f"Loading Faster-Whisper Model: {settings.WHISPER_MODEL_SIZE}...")
                device = settings.WHISPER_DEVICE
                compute_type = settings.WHISPER_COMPUTE_TYPE
                
                self._model = WhisperModel(
                    settings.WHISPER_MODEL_SIZE, 
                    device=device, 
                    compute_type=compute_type
                )
                log.info(f"Whisper Model loaded (Device: {device}).")
            except Exception as e:
                log.error(f"Failed to load Whisper: {e}")
                return None
        return self._model

    async def transcribe(self, audio_file_path: str):
        if self.model is None:
            return {"error": "Whisper model failed to load or is not available."}
            
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
        segments, info = self.model.transcribe(audio_file_path, beam_size=5)
        
        full_text = " ".join([segment.text for segment in segments])
        
        return {
            "text": full_text.strip(),
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration
        }

whisper_service = WhisperService()
