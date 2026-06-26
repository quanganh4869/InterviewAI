from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from schemas.responses.job_posting_schema import JobPostingResponse


class InterviewQuestionResponse(BaseModel):
    id: int
    session_id: int
    question_order: int
    question_text: str
    category: str | None = None
    expected_signal: str | None = None


class InterviewAnswerResponse(BaseModel):
    id: int
    session_id: int
    question_id: int
    answer_order: int
    audio_storage_key: str | None = None
    video_storage_key: str | None = None
    audio_url: str | None = None
    video_url: str | None = None
    mime_type: str | None = None
    duration_seconds: float | None = None
    size_bytes: int | None = None
    transcript: str | None = None
    transcription_status: str
    transcription_error: str | None = None


class InterviewEvaluationResponse(BaseModel):
    id: int
    session_id: int
    overall_score: float
    communication_score: float
    technical_score: float
    jd_alignment_score: float
    evaluation: dict[str, Any] = Field(default_factory=dict)
    provider: str
    created_at: datetime


class InterviewCandidateUserResponse(BaseModel):
    id: int | None = None
    name: str | None = None
    email: str | None = None
    avatar_url: str | None = None


class InterviewSessionResponse(BaseModel):
    id: int
    candidate_user_id: int
    candidate_user: InterviewCandidateUserResponse | None = None
    candidate_name: str | None = None
    candidate_email: str | None = None
    session_type: str = "official"
    job_posting_id: int | None = None
    cv_document_id: int | None = None
    analysis_id: int | None = None
    status: str
    failure_reason: str | None = None
    practice_config: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime | None = None
    job_posting: JobPostingResponse | None = None
    questions: list[InterviewQuestionResponse] = Field(default_factory=list)
    answers: list[InterviewAnswerResponse] = Field(default_factory=list)
    evaluation: InterviewEvaluationResponse | None = None


class InterviewSessionListResponse(BaseModel):
    items: list[InterviewSessionResponse]
    total: int
