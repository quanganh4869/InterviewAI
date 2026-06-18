"""add_plan_quotas

Revision ID: b7e2f4c9a1d3
Revises: f3b9c8d7e6a5
Create Date: 2026-06-17 10:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e2f4c9a1d3"
down_revision: Union[str, None] = "f3b9c8d7e6a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "subscriptions_plans",
        sa.Column("practice_sessions_per_day", sa.Integer(), nullable=True),
    )
    op.add_column(
        "subscriptions_plans",
        sa.Column("cv_upload_limit", sa.Integer(), nullable=True),
    )
    op.add_column(
        "subscriptions_plans",
        sa.Column("jd_upload_limit", sa.Integer(), nullable=True),
    )

    op.execute(
        """
        UPDATE subscriptions_plans
        SET
            practice_sessions_per_day = CASE
                WHEN UPPER(name::text) = 'FREE' THEN 2
                WHEN UPPER(name::text) = 'PRO' THEN 10
                ELSE NULL
            END,
            cv_upload_limit = CASE
                WHEN UPPER(name::text) = 'FREE' THEN 3
                WHEN UPPER(name::text) = 'PRO' THEN 20
                ELSE NULL
            END,
            jd_upload_limit = CASE
                WHEN UPPER(name::text) = 'FREE' THEN 3
                WHEN UPPER(name::text) = 'PRO' THEN 20
                ELSE NULL
            END
        """
    )


def downgrade() -> None:
    op.drop_column("subscriptions_plans", "jd_upload_limit")
    op.drop_column("subscriptions_plans", "cv_upload_limit")
    op.drop_column("subscriptions_plans", "practice_sessions_per_day")
