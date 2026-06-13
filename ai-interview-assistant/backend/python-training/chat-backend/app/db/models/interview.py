from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base.central_declarative_base import Base
from .base.datetime_mixin import DateTimeMixin


class InterviewSession(Base, DateTimeMixin):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_type = Column(String(30), nullable=False, default="official")
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    cv_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    analysis_id = Column(Integer, ForeignKey("cv_jd_analyses.id"), nullable=True)
    status = Column(String(30), nullable=False, default="created")
    failure_reason = Column(Text, nullable=True)
    practice_config_json = Column(JSONB, nullable=False, default=dict)

    candidate_user = relationship("User", foreign_keys=[candidate_user_id])
    job_posting = relationship("JobPosting")
    cv_document = relationship("Document")
    analysis = relationship("CvJdAnalysis")


class InterviewQuestion(Base, DateTimeMixin):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_order = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    expected_signal = Column(Text, nullable=True)

    session = relationship("InterviewSession")


class InterviewAnswer(Base, DateTimeMixin):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("interview_questions.id"), nullable=False)
    answer_order = Column(Integer, nullable=False)
    audio_storage_key = Column(String(1024), nullable=True)
    video_storage_key = Column(String(1024), nullable=True)
    mime_type = Column(String(100), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    transcript = Column(Text, nullable=True)
    transcription_status = Column(String(30), nullable=False, default="pending")
    transcription_error = Column(Text, nullable=True)

    session = relationship("InterviewSession")
    question = relationship("InterviewQuestion")


class InterviewEvaluation(Base, DateTimeMixin):
    __tablename__ = "interview_evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    overall_score = Column(Float, nullable=False, default=0.0)
    communication_score = Column(Float, nullable=False, default=0.0)
    technical_score = Column(Float, nullable=False, default=0.0)
    jd_alignment_score = Column(Float, nullable=False, default=0.0)
    evaluation_json = Column(JSONB, nullable=False, default=dict)
    provider = Column(String(50), nullable=False, default="mock")

    session = relationship("InterviewSession")
