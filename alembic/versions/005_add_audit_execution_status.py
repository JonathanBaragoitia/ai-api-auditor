"""add audit execution status

Revision ID: 005_add_audit_execution_status
Revises: 004_add_audit_user_ownership
Create Date: 2026-05-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_add_audit_execution_status"
down_revision: Union[str, None] = "004_add_audit_user_ownership"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audits", sa.Column("status", sa.String(length=20), nullable=False, server_default="completed"))
    op.add_column("audits", sa.Column("error_message", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("audits", "error_message")
    op.drop_column("audits", "status")
