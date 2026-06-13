from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from core.enums.document_enum import DocumentType
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from services.interview_ai_service import MockInterviewAiProvider
from services.interview_session_service import SESSION_TYPE_PRACTICE, InterviewSessionService
from services.job_posting_service import JobPostingService, parse_jd_metadata
from schemas.requests.interview_schema import InterviewSessionCreateRequest
from schemas.responses.interview_schema import InterviewSessionResponse


def test_parse_jd_metadata_from_structured_summary():
    parsed = parse_jd_metadata(
        {
            "title": "Backend Developer",
            "company": "Vin AI",
            "summary": "\n".join(
                [
                    "Location: Thanh Hoa",
                    "Salary: Tren 50M VND",
                    "Work type: Hybrid",
                    "Experience: 5-7 nam",
                    "Candidate level: Senior",
                    "Deadline: 2026-06-30",
                    "",
                    "Job description:",
                    "Build backend services.",
                    "",
                    "Requirements:",
                    "Python, FastAPI, PostgreSQL.",
                    "",
                    "Benefits:",
                    "Insurance and bonus.",
                ]
            ),
        }
    )

    assert parsed["title"] == "Backend Developer"
    assert parsed["company"] == "Vin AI"
    assert parsed["location"] == "Thanh Hoa"
    assert parsed["work_type"] == "Hybrid"
    assert parsed["description"] == "Build backend services."
    assert parsed["requirements"] == "Python, FastAPI, PostgreSQL."


@pytest.mark.anyio
async def test_job_posting_requires_jd_document():
    service = JobPostingService.__new__(JobPostingService)

    with pytest.raises(ExceptionValueError) as exc_info:
        service._ensure_jd_document(
            SimpleNamespace(id=1, document_type=DocumentType.CV)
        )

    assert exc_info.value.status_code == 422


@pytest.mark.anyio
async def test_mock_ai_provider_returns_questions_and_evaluation():
    provider = MockInterviewAiProvider()

    questions = await provider.generate_questions(
        {
            "job_title": "Backend Developer",
            "missing_skills": ["postgresql"],
        }
    )
    evaluation = await provider.evaluate(
        {
            "answers": [
                {"question_id": 1, "transcript": "I built FastAPI services."},
            ]
        }
    )

    assert questions
    assert any("postgresql" in item["question_text"] for item in questions)
    assert evaluation["overall_score"] > 0
    assert evaluation["per_question_feedback"][0]["question_id"] == 1


@pytest.mark.anyio
async def test_create_session_rejects_hr_actor():
    service = InterviewSessionService.__new__(InterviewSessionService)

    with pytest.raises(ExceptionValueError) as exc_info:
        await service.create_session(
            user=SimpleNamespace(id=2, role=UserRole.HR),
            job_posting_id=1,
            cv_document_id=1,
        )

    assert exc_info.value.status_code == 403


def test_interview_session_serializers_include_media_urls():
    answer = SimpleNamespace(
        id=9,
        session_id=4,
        question_id=3,
        answer_order=1,
        audio_storage_key="uploads/interviews/audio.webm",
        video_storage_key="uploads/interviews/video.webm",
        mime_type="video/webm",
        duration_seconds=12.5,
        size_bytes=2048,
        transcript="Mock transcript",
        transcription_status="completed",
        transcription_error=None,
    )
    question = SimpleNamespace(
        id=3,
        session_id=4,
        question_order=1,
        question_text="Tell me about your backend experience.",
        category="technical",
        expected_signal="Concrete project evidence.",
    )
    evaluation = SimpleNamespace(
        id=7,
        session_id=4,
        overall_score=82.0,
        communication_score=78.0,
        technical_score=84.0,
        jd_alignment_score=86.0,
        evaluation_json={"hiring_recommendation": "Review"},
        provider="mock",
        created_at=datetime(2026, 5, 24, tzinfo=timezone.utc),
    )

    assert InterviewSessionService.serialize_answer(answer)["audio_url"].endswith(
        "/answers/9/media/audio"
    )
    assert InterviewSessionService.serialize_question(question)["question_order"] == 1
    assert InterviewSessionService.serialize_evaluation(evaluation)["overall_score"] == 82.0


def test_practice_session_request_and_response_allow_nullable_job_context():
    request = InterviewSessionCreateRequest(
        session_type=SESSION_TYPE_PRACTICE,
        practice_config={"target_role": "Backend Developer"},
    )
    response = InterviewSessionResponse(
        id=1,
        candidate_user_id=2,
        session_type=SESSION_TYPE_PRACTICE,
        job_posting_id=None,
        cv_document_id=None,
        analysis_id=None,
        status="created",
        failure_reason=None,
        practice_config={"target_role": "Backend Developer"},
        created_at=datetime(2026, 5, 24, tzinfo=timezone.utc),
        updated_at=None,
        job_posting=None,
        questions=[],
        answers=[],
        evaluation=None,
    )

    assert request.session_type == SESSION_TYPE_PRACTICE
    assert response.job_posting_id is None
    assert response.cv_document_id is None
