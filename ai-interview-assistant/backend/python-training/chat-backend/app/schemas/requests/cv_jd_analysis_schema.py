from pydantic import BaseModel, Field, model_validator


class CvJdAnalyzeRequest(BaseModel):
    cv_document_id: int = Field(gt=0)
    jd_text: str | None = None
    job_posting_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def require_jd_text_or_posting(self):
        if not self.job_posting_id and not str(self.jd_text or "").strip():
            raise ValueError("Either jd_text or job_posting_id is required.")
        return self
