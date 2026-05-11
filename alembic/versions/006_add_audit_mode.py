"""add audit mode

Revision ID: 006_add_audit_mode
Revises: 005_add_audit_execution_status
Create Date: 2026-05-11 00:00:00.000000
"""

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "006_add_audit_mode"
down_revision: Union[str, None] = "005_add_audit_execution_status"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column(
        "audits",
        sa.Column("audit_mode", sa.String(length=30), nullable=False, server_default="enterprise"),
    )


def downgrade() -> None:
    op.drop_column("audits", "audit_mode")
