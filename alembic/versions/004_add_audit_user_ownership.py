"""add audit user ownership

Revision ID: 004_add_audit_user_ownership
Revises: 003_add_ai_observations
Create Date: 2026-05-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_add_audit_user_ownership"
down_revision: Union[str, None] = "003_add_ai_observations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audits", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_audits_user_id"), "audits", ["user_id"], unique=False)

    with op.batch_alter_table("audits") as batch_op:
        batch_op.create_foreign_key("fk_audits_user_id_users", "users", ["user_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("audits") as batch_op:
        batch_op.drop_constraint("fk_audits_user_id_users", type_="foreignkey")

    op.drop_index(op.f("ix_audits_user_id"), table_name="audits")
    op.drop_column("audits", "user_id")
