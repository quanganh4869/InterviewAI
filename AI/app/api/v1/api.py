from fastapi import APIRouter
from app.api.v1.endpoints import match, extract, stt, search, tts

api_router = APIRouter()

api_router.include_router(match.router, prefix="/ai", tags=["AI Matching"])
api_router.include_router(extract.router, prefix="/extract", tags=["OCR Extraction"])
api_router.include_router(stt.router, prefix="/stt", tags=["Speech To Text"])
api_router.include_router(search.router, prefix="/search", tags=["Semantic Search"])
api_router.include_router(tts.router, prefix="/tts", tags=["Text To Speech"])
