"""Add ADMIN user role.

Revision ID: 2f7a91c4d3b8
Revises: 9c3a7b1d2e4f
Create Date: 2026-05-18 09:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2f7a91c4d3b8"
down_revision: Union[str, None] = "9c3a7b1d2e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMIN'")


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'USER' WHERE role = 'ADMIN'")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE text USING role::text")
    op.execute("DROP TYPE userrole")
    op.execute("CREATE TYPE userrole AS ENUM ('USER', 'HR')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole"
    )
