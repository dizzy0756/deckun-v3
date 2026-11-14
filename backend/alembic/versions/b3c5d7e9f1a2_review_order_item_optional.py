"""make review order_item_id optional

Revision ID: b3c5d7e9f1a2
Revises: 8f2a1c7d4e90
Create Date: 2026-11-14 14:05:00.000000

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3c5d7e9f1a2"
down_revision: str | None = "8f2a1c7d4e90"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    with op.batch_alter_table("reviews") as batch_op:
        batch_op.alter_column(
            "order_item_id",
            existing_type=sa.Uuid(),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("reviews") as batch_op:
        batch_op.alter_column(
            "order_item_id",
            existing_type=sa.Uuid(),
            nullable=False,
        )
