from typing import Any

from pydantic import BaseModel, Field


class InterviewSessionCreateRequest(BaseModel):
    session_type: str = Field(default="official")
    job_posting_id: int | None = Field(default=None, gt=0)
    cv_document_id: int | None = Field(default=None, gt=0)
    analysis_id: int | None = Field(default=None, gt=0)
    practice_config: dict[str, Any] | None = None


class InterviewFinishRequest(BaseModel):
    force_evaluate: bool = False


class InterviewCompareRequest(BaseModel):
    session_ids: list[int] = Field(..., description="List of session IDs to compare")

