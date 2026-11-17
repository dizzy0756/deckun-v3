"""make user mobile_number optional for Google sign-in

Revision ID: c4d6e8f0a2b3
Revises: b3c5d7e9f1a2
Create Date: 2026-11-17 15:05:00.000000

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4d6e8f0a2b3"
down_revision: str | None = "b3c5d7e9f1a2"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "mobile_number",
            existing_type=sa.String(length=15),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "mobile_number",
            existing_type=sa.String(length=15),
            nullable=False,
        )
