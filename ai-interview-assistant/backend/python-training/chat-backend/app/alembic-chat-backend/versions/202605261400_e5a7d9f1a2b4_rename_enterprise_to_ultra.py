"""rename_enterprise_to_ultra

Revision ID: e5a7d9f1a2b4
Revises: c9d7e8f1a2b3
Create Date: 2026-05-26 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5a7d9f1a2b4"
down_revision: Union[str, None] = "c9d7e8f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename enum value in PostgreSQL
    op.execute("ALTER TYPE subscriptionplanname RENAME VALUE 'ENTERPRISE' TO 'ULTRA'")
    
    # Update plan details in subscriptions_plans
    op.execute(
        """
        UPDATE subscriptions_plans
        SET price = 299000, description = 'Ultra plan'
        WHERE name = 'ULTRA'
        """
    )


def downgrade() -> None:
    # Revert enum value name
    op.execute("ALTER TYPE subscriptionplanname RENAME VALUE 'ULTRA' TO 'ENTERPRISE'")
    
    # Revert plan details
    op.execute(
        """
        UPDATE subscriptions_plans
        SET price = 499000, description = 'Enterprise plan'
        WHERE name = 'ENTERPRISE'
        """
    )
