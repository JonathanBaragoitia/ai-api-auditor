"""add audit notes and tags

Revision ID: 007_add_audit_notes_tags
Revises: 006_add_audit_mode
Create Date: 2026-05-11 00:00:00.000000
"""

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "007_add_audit_notes_tags"
down_revision: Union[str, None] = "006_add_audit_mode"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("audits", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("audits", sa.Column("tags", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("audits", "tags")
    op.drop_column("audits", "notes")
