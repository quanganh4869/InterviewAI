from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CvJdSkillGapResponse(BaseModel):
    matched_hard_skills: list[str] = Field(default_factory=list)
    missing_hard_skills: list[str] = Field(default_factory=list)


class CvJdAnalysisDetailResponse(BaseModel):
    id: int
    analyst_user_id: int
    cv_document_id: int
    job_posting_id: int | None = None
    cv_file_name_snapshot: str
    jd_text: str
    overall_score: float
    executive_summary: str
    skill_gap: CvJdSkillGapResponse
    deep_experience_alignment: str
    actionable_recommendations: list[str] = Field(default_factory=list)
    score_breakdown: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class CvJdAnalysisHistoryItemResponse(BaseModel):
    id: int
    cv_document_id: int
    job_posting_id: int | None = None
    cv_file_name_snapshot: str
    overall_score: float
    executive_summary: str
    created_at: datetime


class CvJdAnalysisHistoryResponse(BaseModel):
    items: list[CvJdAnalysisHistoryItemResponse]
    total: int
    page: int
    page_size: int
