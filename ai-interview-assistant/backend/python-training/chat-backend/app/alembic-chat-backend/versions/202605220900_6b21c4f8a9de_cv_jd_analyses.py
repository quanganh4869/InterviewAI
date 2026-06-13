"""Add CV/JD analysis reports.

Revision ID: 6b21c4f8a9de
Revises: 2f7a91c4d3b8
Create Date: 2026-05-22 09:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "6b21c4f8a9de"
down_revision: Union[str, None] = "2f7a91c4d3b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cv_jd_analyses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("analyst_user_id", sa.Integer(), nullable=False),
        sa.Column("cv_document_id", sa.Integer(), nullable=False),
        sa.Column("cv_file_name_snapshot", sa.String(length=512), nullable=False),
        sa.Column("jd_text", sa.Text(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column(
            "report_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "score_breakdown_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["analyst_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["cv_document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_cv_jd_analyses_actor_created_at",
        "cv_jd_analyses",
        ["analyst_user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_cv_jd_analyses_actor_created_at", table_name="cv_jd_analyses")
    op.drop_table("cv_jd_analyses")
