from pydantic import BaseModel, Field


class JobPostingFromDocumentRequest(BaseModel):
    jd_document_id: int = Field(gt=0)
    publish: bool = False


class JobPostingUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1)
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
