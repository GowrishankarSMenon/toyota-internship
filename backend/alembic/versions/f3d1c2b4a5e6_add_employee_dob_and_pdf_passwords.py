"""add employee dob and pdf password support

Revision ID: f3d1c2b4a5e6
Revises: b0eab9acad33
Create Date: 2026-06-01 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3d1c2b4a5e6'
down_revision: Union[str, None] = 'b0eab9acad33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('employees', sa.Column('dob', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('employees', 'dob')