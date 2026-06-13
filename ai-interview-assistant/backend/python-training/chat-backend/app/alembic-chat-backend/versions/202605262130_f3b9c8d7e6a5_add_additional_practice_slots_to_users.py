"""add_additional_practice_slots_to_users

Revision ID: f3b9c8d7e6a5
Revises: e5a7d9f1a2b4
Create Date: 2026-05-26 21:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f3b9c8d7e6a5"
down_revision: Union[str, None] = "e5a7d9f1a2b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "additional_practice_slots",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "additional_practice_slots")
