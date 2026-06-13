import logging
import os
import tempfile
import asyncio
import hashlib
import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
import edge_tts
from app.core.config import settings

router = APIRouter()
log = logging.getLogger(__name__)

# Determine cache folder
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
CACHE_DIR = os.path.join(ROOT_DIR, "tts_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Mapping voice names to edge-tts voices
VOICES_MAP = {
    "mc_nam": {"vi": "vi-VN-NamMinhNeural", "en": "en-US-GuyNeural"},
    "mc_nu": {"vi": "vi-VN-HoaiMyNeural", "en": "en-US-AriaNeural"},
    "do_mixi": {"vi": "vi-VN-NamMinhNeural", "en": "en-US-GuyNeural"}  # Custom pitch/rate configuration
}

def is_english_text(text: str) -> bool:
    # Check for Vietnamese accented characters
    vi_accents = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ"
    return not any(char in vi_accents for char in text)

@router.get("/synthesize")
async def synthesize_text(
    text: str = Query(..., description="Văn bản cần đọc"),
    voice: str = Query("mc_nam", description="Giọng đọc: mc_nam, mc_nu, do_mixi")
):
    """
    Synthesize text to speech using Microsoft Edge TTS.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    # Determine if ElevenLabs voice is requested and key is available
    is_elevenlabs = False
    voice_id = None
    if settings.ELEVENLABS_API_KEY:
        if voice == "eleven_nam":
            is_elevenlabs = True
            voice_id = "pNInz6obpmmqZClfhlaH"  # Adam (Male)
        elif voice == "eleven_nu":
            is_elevenlabs = True
            voice_id = "EXAVITQu4vr4xnSDxMaL"  # Bella (Female)
        elif len(voice) == 20 and voice.isalnum():
            is_elevenlabs = True
            voice_id = voice

    if is_elevenlabs and voice_id:
        hash_key = hashlib.md5(f"{text}_{voice_id}_elevenlabs".encode("utf-8")).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{hash_key}.mp3")
        
        if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
            log.info(f"Serving ElevenLabs audio from cache: {cache_path}")
            return FileResponse(path=cache_path, media_type="audio/mpeg")
            
        try:
            log.info(f"Synthesizing with ElevenLabs. Voice ID: {voice_id}")
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            headers = {
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    with open(cache_path, "wb") as f:
                        f.write(response.content)
                    log.info(f"ElevenLabs synthesis successful. Cached to {cache_path}")
                    return FileResponse(path=cache_path, media_type="audio/mpeg")
                else:
                    log.error(f"ElevenLabs API error: {response.status_code} - {response.text}. Falling back to Edge TTS.")
        except Exception as e:
            log.error(f"ElevenLabs exception: {e}. Falling back to Edge TTS.")

    # Determine language
    lang = "en" if is_english_text(text) else "vi"
    
    # Get voice config
    voice_config = VOICES_MAP.get(voice)
    if not voice_config:
        voice_config = VOICES_MAP["mc_nam"]  # Fallback
        
    voice_name = voice_config[lang]
    
    # Special tuning for voices
    pitch = "+0Hz"
    rate = "+0%"
    
    if voice == "do_mixi":
        # Fake Độ Mixi by raising pitch and speeding up the voice
        # Feel free to plug in real cloned voice model endpoint here (e.g. GPT-SoVITS / VITS)
        pitch = "+4Hz"
        rate = "+16%"
    elif voice == "mc_nam":
        rate = "-2%"  # Slightly slower for professional MC feel
    elif voice == "mc_nu":
        rate = "-1%"
        
    # Generate unique hash key for cache lookup
    hash_key = hashlib.md5(f"{text}_{voice}_{pitch}_{rate}".encode("utf-8")).hexdigest()
    cache_path = os.path.join(CACHE_DIR, f"{hash_key}.mp3")
    
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
        log.info(f"Serving from cache: {cache_path}")
        return FileResponse(path=cache_path, media_type="audio/mpeg")

    log.info(f"Synthesizing text: '{text[:30]}...' with voice: {voice_name} (pitch={pitch}, rate={rate})")
    
    try:
        communicate = edge_tts.Communicate(text, voice_name, pitch=pitch, rate=rate)
        
        success = False
        last_error = None
        for attempt in range(3):
            try:
                await communicate.save(cache_path)
                if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
                    success = True
                    break
            except Exception as e:
                last_error = e
                log.warning(f"TTS download attempt {attempt+1} failed: {e}. Retrying...")
                await asyncio.sleep(0.3)
                
        if not success:
            if os.path.exists(cache_path):
                try:
                    os.remove(cache_path)
                except Exception:
                    pass
            raise last_error or Exception("Failed to generate audio after 3 attempts.")
            
        return FileResponse(path=cache_path, media_type="audio/mpeg")
            
    except Exception as e:
        log.error(f"TTS Error: {e}")
        if os.path.exists(cache_path):
            try:
                os.remove(cache_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=str(e))
