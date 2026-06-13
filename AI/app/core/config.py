import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Base API
    APP_NAME: str = "Unified AI Matcher"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # Models
    EMBEDDING_MODEL_NAME: str = "paraphrase-multilingual-MiniLM-L12-v2"
    WHISPER_MODEL_SIZE: str = "small"
    GEMINI_API_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None

    # OCR
    TESSERACT_CMD: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    # Security
    SECRET_KEY: str = "supersecretkey"

    # Matcher Config
    MATCH_THRESHOLD: float = 0.6
    WEIGHT_SEMANTIC: float = 0.5
    WEIGHT_SKILL: float = 0.3
    WEIGHT_EXPERIENCE: float = 0.2

    # Database
    CHROMA_DB_PATH: str = "db/chroma"

    @property
    def has_tesseract(self) -> bool:
        return os.path.exists(self.TESSERACT_CMD)

settings = Settings()
