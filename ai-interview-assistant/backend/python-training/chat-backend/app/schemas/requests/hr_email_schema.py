from pydantic import BaseModel, EmailStr, Field


class HrSendCandidateEmailRequest(BaseModel):
    to_email: EmailStr
    to_name: str = Field(min_length=1, max_length=255)
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=5000)
    candidate_id: str | None = Field(default=None, max_length=64)
    job_title: str | None = Field(default=None, max_length=255)
    internal_note: str | None = Field(default=None, max_length=2000)
