"""add ai observations

Revision ID: 003_add_ai_observations
Revises: 002_store_openapi_audit_results
Create Date: 2026-05-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_add_ai_observations"
down_revision: Union[str, None] = "002_store_openapi_audit_results"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audits", sa.Column("summary", sa.Text(), nullable=True))
    op.add_column("audits", sa.Column("technical_observation", sa.Text(), nullable=True))
    op.add_column("audits", sa.Column("security_observation", sa.Text(), nullable=True))
    op.add_column("audits", sa.Column("maintainability_observation", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("audits", "maintainability_observation")
    op.drop_column("audits", "security_observation")
    op.drop_column("audits", "technical_observation")
    op.drop_column("audits", "summary")
