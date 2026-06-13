from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base.central_declarative_base import Base
from .base.datetime_mixin import DateTimeMixin


class CvJdAnalysis(Base, DateTimeMixin):
    __tablename__ = "cv_jd_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analyst_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cv_document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    cv_file_name_snapshot = Column(String(512), nullable=False)
    jd_text = Column(Text, nullable=False)
    overall_score = Column(Float, nullable=False)
    report_json = Column(JSONB, nullable=False, default=dict)
    score_breakdown_json = Column(JSONB, nullable=False, default=dict)

    analyst = relationship("User")
    cv_document = relationship("Document")
    job_posting = relationship("JobPosting")
