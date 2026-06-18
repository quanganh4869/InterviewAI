from pathlib import Path
from typing import ClassVar, Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    BASE_DIR: ClassVar[Path] = Path(__file__).resolve().parent

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str
    ENVIRONMENT: Literal["unittest", "develop", "testing", "staging", "production"]
    BACKEND_CORS_ORIGINS: list[str] = []
    BACKEND_CORS_METHODS: list[str] = [
        "GET",
        "POST",
        "PUT",
        "OPTIONS",
        "PATCH",
        "DELETE",
    ]

    # Database settings
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int
    POSTGRES_SSL_MODE: str = "disable"
    DB_ECHO: bool = False
    DB_INIT: bool = False

    # Read-only Database settings
    READ_ONLY_POSTGRES_SERVER: str
    READ_ONLY_POSTGRES_USER: str
    READ_ONLY_POSTGRES_PASSWORD: str
    READ_ONLY_POSTGRES_DB: str
    READ_ONLY_POSTGRES_PORT: int
    READ_ONLY_POSTGRES_SSL_MODE: str = "disable"

    # AES-GCM
    APP_SECRET_ROTATION_KEY_MAPPING: dict = {}
    APP_SECRET_CURRENT_VERSION: str

    # Storage settings
    STORAGE_STRATEGY: Literal["local", "r2"] = "local"
    UPLOAD_DIR: str = "uploads"
    CLOUDFLARE_R2_ACCESS_KEY_ID: str = ""
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str = ""
    CLOUDFLARE_R2_REGION: str = "auto"
    CLOUDFLARE_R2_ENDPOINT: str = ""
    CLOUDFLARE_R2_BUCKET_NAME: str = ""
    CLOUDFLARE_R2_PRESIGNED_EXPIRES_SECONDS: int = 900
    CLOUDFLARE_R2_PRESIGNED_GET_EXPIRES_SECONDS: int = 600
    DOCUMENT_CV_PREFIX: str = ""
    DOCUMENT_JD_PREFIX: str = ""
    INTERVIEW_RECORDING_PREFIX: str = "interviews"

    # AI interview provider settings
    OPENAI_API_KEY: str = ""
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_TRANSCRIBE_MODEL: str = "whisper-1"
    GEMINI_API_KEY: str = ""
    GEMINI_CHAT_MODEL: str = "gemini-3.1-flash-lite"
    INTERVIEW_MAX_QUESTIONS: int = 6
    LOCAL_WHISPER_URL: str = "http://localhost:8001/api/v1/stt/transcribe"

    # CV parser settings
    CV_PARSE_MAX_EXTRACTED_CHARS: str = "12000"
    CV_PARSE_MAX_HIGHLIGHTS: str = "8"
    CV_PARSE_MAX_DIAGNOSTICS_IN_ERROR: str = "12"
    CV_OCR_ENABLED: str = "true"
    CV_OCR_LANG: str = "vie+eng"
    CV_OCR_DPI: str = "300"
    TESSERACT_CMD: str = ""
    TESSDATA_PREFIX: str = ""
    CV_PARSE_LEADING_BULLET_PATTERN: str = (
        r"^[\s\-\*\>\u00bb\u2022\u2023\u2043\u2219\u25aa\u25ab"
        r"\u25cf\u25a0\u25e6\u00b7\uf0a7\uf0b7\uf071]+"
    )
    CV_PARSE_LEADING_SYMBOL_RUN_PATTERN: str = r"^[^\w]+(?=\w)"

    # CV/JD match scoring settings
    EMBEDDING_MODEL_NAME: str = "paraphrase-multilingual-MiniLM-L12-v2"
    CV_JD_EMBEDDING_ENABLED: bool = True
    WEIGHT_SEMANTIC: float = 0.5
    WEIGHT_SKILL: float = 0.3
    WEIGHT_EXPERIENCE: float = 0.2

    # Google OAuth
    GOOGLE_AUTH_URL: str = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL: str = "https://oauth2.googleapis.com/token"
    GOOGLE_SCOPES: list[str] = ["openid", "email", "profile"]
    GOOGLE_TOKEN_ISSUERS: list[str] = [
        "accounts.google.com",
        "https://accounts.google.com",
    ]

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/v1_0/auth/login/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # Email delivery settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "AI Interview Assistant"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_TIMEOUT_SECONDS: int = 20

    # JWT
    JWT_ALGORITHM: str = "RS256"
    JWT_RSA_KEY_ID: str = "key_20250805"
    JWT_RSA_PRIVATE_KEY: str = ""
    JWT_RSA_PRIVATE_KEY_B64: str = ""
    JWT_RSA_PUBLIC_KEY: str = ""
    JWT_RSA_PUBLIC_KEY_B64: str = ""
    RSA_KEY_MANIFEST: dict = {
        "current_kid": "key_20250805",
        "keys": {
            "key_20250805": {
                "private_path": str(
                    BASE_DIR / ".keys" / "rsa_private_key_20250805.pem"
                ),
                "public_path": str(BASE_DIR / ".keys" / "rsa_public_key_20250805.pem"),
                "status": "active",
            }
        },
    }
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    TOKEN_EXCLUDE_URLS: list[str] = [
        "/docs",
        "/openapi.json",
        "/favicon.ico",
        "/health",
        "/v1_0/auth/jwks",
        "/v1_0/auth/google/login",
        "/v1_0/auth/login/google/callback",
        "/v1_0/auth/login/google",
        "/v1_0/auth/refresh",
    ]


configuration = Settings()
