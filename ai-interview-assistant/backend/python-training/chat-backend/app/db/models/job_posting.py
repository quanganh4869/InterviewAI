from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .base.central_declarative_base import Base
from .base.datetime_mixin import DateTimeMixin


class JobPosting(Base, DateTimeMixin):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hr_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    jd_document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    salary = Column(String(255), nullable=True)
    work_type = Column(String(100), nullable=True)
    experience = Column(String(100), nullable=True)
    level = Column(String(100), nullable=True)
    deadline = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    benefits = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="draft")

    hr_user = relationship("User", foreign_keys=[hr_user_id])
    jd_document = relationship("Document")
