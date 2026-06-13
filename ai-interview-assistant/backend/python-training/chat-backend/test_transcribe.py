import os
import sys
import asyncio

# Add app to system path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

async def test():
    from services.interview_ai_service import ResilientInterviewAiProvider
    from configuration.settings import configuration
    
    print("LOCAL_WHISPER_URL configured in settings:", getattr(configuration, "LOCAL_WHISPER_URL", "NOT FOUND"))
    
    provider = ResilientInterviewAiProvider()
    print("AI Provider initialized. Chosen provider:", provider.provider_name)
    
    audio_path = "/app/testwwhisper.mp3"
    if not os.path.exists(audio_path):
        print(f"Error: {audio_path} does not exist in container.")
        return
        
    with open(audio_path, "rb") as f:
        media_bytes = f.read()
        
    print(f"Loaded {len(media_bytes)} bytes of audio. Running transcribe...")
    
    try:
        transcript = await provider.transcribe(media_bytes, "testwwhisper.mp3", "audio/mpeg")
        print("\n=== TRANSCRIPTION SUCCESS ===")
        print(transcript)
        print("=============================")
    except Exception as e:
        print("\n=== TRANSCRIPTION FAILED ===")
        import traceback
        traceback.print_exc()
        print("============================")

if __name__ == "__main__":
    asyncio.run(test())
