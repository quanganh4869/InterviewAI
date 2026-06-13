import os
import sys
import asyncio

sys.path.append(os.path.dirname(__file__))

async def test():
    from db.db_connection import Database
    from sqlalchemy import select
    from db.models.interview import InterviewAnswer, InterviewSession
    
    async with Database.get_instance_db() as db_session:
        # Get latest 5 answers
        query = select(InterviewAnswer).order_by(InterviewAnswer.created_at.desc()).limit(5)
        result = await db_session.execute(query)
        answers = result.scalars().all()
        
        print("\n=== LATEST 5 ANSWERS IN DB ===")
        if not answers:
            print("No answers found in database.")
        for idx, ans in enumerate(answers):
            print(f"\n[{idx+1}] Answer ID: {ans.id}")
            print(f"Session ID: {ans.session_id}")
            print(f"Question ID: {ans.question_id}")
            print(f"Mime Type: {ans.mime_type}")
            print(f"Transcription Status: {ans.transcription_status}")
            print(f"Transcription Error: {ans.transcription_error}")
            print(f"Transcript: {ans.transcript}")
            print(f"Created At: {ans.created_at}")
        print("==============================")

if __name__ == "__main__":
    asyncio.run(test())
