"""Add job postings and interview sessions.

Revision ID: a3f4c2d91b80
Revises: 6b21c4f8a9de
Create Date: 2026-05-24 09:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a3f4c2d91b80"
down_revision: Union[str, None] = "6b21c4f8a9de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "job_postings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("hr_user_id", sa.Integer(), nullable=False),
        sa.Column("jd_document_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("salary", sa.String(length=255), nullable=True),
        sa.Column("work_type", sa.String(length=100), nullable=True),
        sa.Column("experience", sa.String(length=100), nullable=True),
        sa.Column("level", sa.String(length=100), nullable=True),
        sa.Column("deadline", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("benefits", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="draft", nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["hr_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["jd_document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_postings_status_created_at", "job_postings", ["status", "created_at"])
    op.create_index("ix_job_postings_hr_created_at", "job_postings", ["hr_user_id", "created_at"])

    op.create_table(
        "interview_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_user_id", sa.Integer(), nullable=False),
        sa.Column("job_posting_id", sa.Integer(), nullable=False),
        sa.Column("cv_document_id", sa.Integer(), nullable=False),
        sa.Column("analysis_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="created", nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["candidate_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["job_posting_id"], ["job_postings.id"]),
        sa.ForeignKeyConstraint(["cv_document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["analysis_id"], ["cv_jd_analyses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_interview_sessions_candidate_created_at",
        "interview_sessions",
        ["candidate_user_id", "created_at"],
    )
    op.create_index(
        "ix_interview_sessions_job_created_at",
        "interview_sessions",
        ["job_posting_id", "created_at"],
    )

    op.create_table(
        "interview_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("question_order", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("expected_signal", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_interview_questions_session_order",
        "interview_questions",
        ["session_id", "question_order"],
        unique=True,
    )

    op.create_table(
        "interview_answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("answer_order", sa.Integer(), nullable=False),
        sa.Column("audio_storage_key", sa.String(length=1024), nullable=True),
        sa.Column("video_storage_key", sa.String(length=1024), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("transcription_status", sa.String(length=30), server_default="pending", nullable=False),
        sa.Column("transcription_error", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"]),
        sa.ForeignKeyConstraint(["question_id"], ["interview_questions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_interview_answers_session_order",
        "interview_answers",
        ["session_id", "answer_order"],
    )

    op.create_table(
        "interview_evaluations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("overall_score", sa.Float(), server_default="0", nullable=False),
        sa.Column("communication_score", sa.Float(), server_default="0", nullable=False),
        sa.Column("technical_score", sa.Float(), server_default="0", nullable=False),
        sa.Column("jd_alignment_score", sa.Float(), server_default="0", nullable=False),
        sa.Column(
            "evaluation_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=50), server_default="mock", nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interview_evaluations_session", "interview_evaluations", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_interview_evaluations_session", table_name="interview_evaluations")
    op.drop_table("interview_evaluations")
    op.drop_index("ix_interview_answers_session_order", table_name="interview_answers")
    op.drop_table("interview_answers")
    op.drop_index("ix_interview_questions_session_order", table_name="interview_questions")
    op.drop_table("interview_questions")
    op.drop_index("ix_interview_sessions_job_created_at", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_candidate_created_at", table_name="interview_sessions")
    op.drop_table("interview_sessions")
    op.drop_index("ix_job_postings_hr_created_at", table_name="job_postings")
    op.drop_index("ix_job_postings_status_created_at", table_name="job_postings")
    op.drop_table("job_postings")
