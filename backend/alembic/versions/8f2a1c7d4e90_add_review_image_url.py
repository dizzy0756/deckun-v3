"""add image_url to reviews

Revision ID: 8f2a1c7d4e90
Revises: 1bc4b7546024
Create Date: 2026-11-14 13:55:00.000000

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8f2a1c7d4e90"
down_revision: str | None = "1bc4b7546024"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    with op.batch_alter_table("reviews") as batch_op:
        batch_op.add_column(sa.Column("image_url", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("reviews") as batch_op:
        batch_op.drop_column("image_url")
