import asyncio
import json
from app.ai.services.jd_matcher_service import JDMatcherService

async def main():
    print("--- Starting AI Services ---")
    matcher = JDMatcherService()
    
    # Dữ liệu giả lập
    cv_sample = """
    Nguyễn Văn A. Kỹ sư Python với 5 năm kinh nghiệm. 
    Thành thạo FastAPI, Docker và AWS.
    """
    
    jd_sample = """
    Cần tuyển Senior Python Developer. 
    Yêu cầu: Kinh nghiệm FastAPI, Docker. Biết AWS là lợi thế.
    """
    
    print("\n--- Running Matching ---")
    result = await matcher.match(cv_sample, jd_sample)
    
    print("\n--- TEST RESULT: ---")
    print(json.dumps(result, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
