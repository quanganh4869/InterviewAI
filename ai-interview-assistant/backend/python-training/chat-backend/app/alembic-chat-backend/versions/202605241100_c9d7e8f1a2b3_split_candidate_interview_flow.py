"""Link CV/JD analyses to postings and support practice sessions.

Revision ID: c9d7e8f1a2b3
Revises: a3f4c2d91b80
Create Date: 2026-05-24 11:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c9d7e8f1a2b3"
down_revision: Union[str, None] = "a3f4c2d91b80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cv_jd_analyses", sa.Column("job_posting_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_cv_jd_analyses_job_posting_id_job_postings",
        "cv_jd_analyses",
        "job_postings",
        ["job_posting_id"],
        ["id"],
    )
    op.create_index(
        "ix_cv_jd_analyses_job_posting_created_at",
        "cv_jd_analyses",
        ["job_posting_id", "created_at"],
    )

    op.add_column(
        "interview_sessions",
        sa.Column("session_type", sa.String(length=30), server_default="official", nullable=False),
    )
    op.add_column(
        "interview_sessions",
        sa.Column(
            "practice_config_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.alter_column("interview_sessions", "job_posting_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("interview_sessions", "cv_document_id", existing_type=sa.Integer(), nullable=True)
    op.create_index(
        "ix_interview_sessions_type_candidate_created_at",
        "interview_sessions",
        ["session_type", "candidate_user_id", "created_at"],
    )
    op.create_index(
        "ix_interview_sessions_candidate_analysis_status",
        "interview_sessions",
        ["candidate_user_id", "analysis_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_interview_sessions_candidate_analysis_status", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_type_candidate_created_at", table_name="interview_sessions")
    op.alter_column("interview_sessions", "cv_document_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("interview_sessions", "job_posting_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("interview_sessions", "practice_config_json")
    op.drop_column("interview_sessions", "session_type")

    op.drop_index("ix_cv_jd_analyses_job_posting_created_at", table_name="cv_jd_analyses")
    op.drop_constraint(
        "fk_cv_jd_analyses_job_posting_id_job_postings",
        "cv_jd_analyses",
        type_="foreignkey",
    )
    op.drop_column("cv_jd_analyses", "job_posting_id")
