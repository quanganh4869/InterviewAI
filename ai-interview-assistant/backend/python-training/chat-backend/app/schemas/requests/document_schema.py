from pydantic import BaseModel, Field


class DocumentAccessUrlRequest(BaseModel):
    expires_in: int | None = Field(default=None, ge=60, le=3600)
    image_only: bool = False


class DocumentMatchScoreRequest(BaseModel):
    cv_document_id: int = Field(gt=0)
    jd_text: str = Field(min_length=1)


class DocumentUpdateRequest(BaseModel):
    file_name: str | None = Field(default=None, min_length=1, max_length=512)
    target_role: str | None = Field(default=None, max_length=255)
    title: str | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, max_length=255)
    summary: str | None = None
