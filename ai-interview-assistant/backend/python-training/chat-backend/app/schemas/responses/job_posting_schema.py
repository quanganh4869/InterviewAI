from datetime import datetime

from pydantic import BaseModel


class JobPostingResponse(BaseModel):
    id: int
    hr_user_id: int
    jd_document_id: int
    title: str
    company: str | None = None
    location: str | None = None
    salary: str | None = None
    work_type: str | None = None
    experience: str | None = None
    level: str | None = None
    deadline: str | None = None
    description: str | None = None
    requirements: str | None = None
    benefits: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None


class JobPostingListResponse(BaseModel):
    items: list[JobPostingResponse]
    total: int
