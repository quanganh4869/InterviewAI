import logging
import os
import re
from faster_whisper import WhisperModel
from app.core.config import settings

log = logging.getLogger(__name__)

INTERVIEW_INITIAL_PROMPT = (
    "Đây là câu trả lời trong buổi phỏng vấn tuyển dụng bằng tiếng Việt. "
    "Giữ nguyên thuật ngữ tiếng Anh và tên công nghệ như Java, Spring Boot, React, Node.js, "
    "Python, Docker, Kubernetes, AWS, SQL, PostgreSQL, MySQL, Redis, API, microservice, CI/CD. "
    "Chép lại chính xác lời ứng viên nói, không tóm tắt và không thêm nhận xét."
)


def _normalize_transcript(text: str) -> str:
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    return text

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

    async def transcribe(self, audio_file_path: str, language: str | None = None):
        if self.model is None:
            return {"error": "Whisper model failed to load or is not available."}
            
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
        segments, info = self.model.transcribe(
            audio_file_path,
            language=language or settings.WHISPER_LANGUAGE or "vi",
            task="transcribe",
            beam_size=settings.WHISPER_BEAM_SIZE,
            best_of=settings.WHISPER_BEST_OF,
            vad_filter=settings.WHISPER_VAD_FILTER,
            vad_parameters={
                "min_silence_duration_ms": 550,
                "speech_pad_ms": 300,
            },
            initial_prompt=INTERVIEW_INITIAL_PROMPT,
            condition_on_previous_text=False,
            word_timestamps=False,
            no_speech_threshold=settings.WHISPER_NO_SPEECH_THRESHOLD,
            log_prob_threshold=settings.WHISPER_LOG_PROB_THRESHOLD,
            compression_ratio_threshold=settings.WHISPER_COMPRESSION_RATIO_THRESHOLD,
        )

        segment_items = [
            {
                "start": round(float(segment.start or 0), 2),
                "end": round(float(segment.end or 0), 2),
                "text": _normalize_transcript(segment.text),
                "avg_logprob": getattr(segment, "avg_logprob", None),
                "no_speech_prob": getattr(segment, "no_speech_prob", None),
            }
            for segment in segments
            if _normalize_transcript(segment.text)
        ]

        full_text = _normalize_transcript(" ".join(item["text"] for item in segment_items))
        
        return {
            "text": full_text.strip(),
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration,
            "segments": segment_items,
        }

whisper_service = WhisperService()
