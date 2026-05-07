"""store openapi audit results

Revision ID: 002_store_openapi_audit_results
Revises: 001_initial_schema
Create Date: 2026-05-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_store_openapi_audit_results"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audits", sa.Column("total_endpoints", sa.Integer(), nullable=True))
    op.add_column("audits", sa.Column("average_score", sa.Float(), nullable=True))
    op.add_column("audits", sa.Column("global_risk_level", sa.String(length=50), nullable=True))
    op.add_column("audits", sa.Column("openapi_endpoints", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("audits", "openapi_endpoints")
    op.drop_column("audits", "global_risk_level")
    op.drop_column("audits", "average_score")
    op.drop_column("audits", "total_endpoints")
