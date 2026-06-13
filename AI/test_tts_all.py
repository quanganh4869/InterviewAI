import httpx
import os

voices = ["mc_nam", "mc_nu", "do_mixi"]
texts = {
    "vi": "Xin chào, đây là kịch bản phỏng vấn thử nghiệm bằng tiếng Việt.",
    "en": "Hello, this is a test interview script in English."
}

base_url = "http://127.0.0.1:8001/api/v1/tts/synthesize"

print("--- STARTING TTS VOICES VALIDATION ---")
for voice in voices:
    for lang, text in texts.items():
        print(f"Testing voice: {voice} | Lang: {lang}...")
        try:
            response = httpx.get(
                base_url,
                params={"text": text, "voice": voice},
                timeout=10.0
            )
            if response.status_code == 200:
                content_size = len(response.content)
                print(f"  [SUCCESS] Status: 200 OK | Audio file size: {content_size} bytes")
                # Save a sample to verify it's valid
                filename = f"sample_{voice}_{lang}.mp3"
                with open(filename, "wb") as f:
                    f.write(response.content)
                print(f"  Saved sample to {filename}")
            else:
                print(f"  [FAILED] Status: {response.status_code} | Response: {response.text}")
        except Exception as e:
            print(f"  [ERROR] Connection failed: {e}")

print("--- TTS VOICES VALIDATION COMPLETED ---")
