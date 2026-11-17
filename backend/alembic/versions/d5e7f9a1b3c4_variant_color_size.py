"""add color and size to product variants

Revision ID: d5e7f9a1b3c4
Revises: c4d6e8f0a2b3
Create Date: 2026-11-17 15:30:00.000000

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d5e7f9a1b3c4"
down_revision: str | None = "c4d6e8f0a2b3"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    with op.batch_alter_table("product_variants") as batch_op:
        batch_op.add_column(sa.Column("color", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("size", sa.String(length=50), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("product_variants") as batch_op:
        batch_op.drop_column("size")
        batch_op.drop_column("color")
