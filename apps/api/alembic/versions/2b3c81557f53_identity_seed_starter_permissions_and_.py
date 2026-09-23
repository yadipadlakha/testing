"""identity: seed starter permissions and system roles

Revision ID: 2b3c81557f53
Revises: 314372b97818
Create Date: 2026-09-23 04:19:19.045302

"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.modules.identity.seed_data import PERMISSIONS, ROLE_PERMISSIONS

revision: str = "2b3c81557f53"
down_revision: str | None = "314372b97818"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


permissions_table = sa.table(
    "permissions",
    sa.column("id", sa.UUID()),
    sa.column("code", sa.String()),
    sa.column("description", sa.String()),
)
roles_table = sa.table(
    "roles",
    sa.column("id", sa.UUID()),
    sa.column("organization_id", sa.UUID()),
    sa.column("name", sa.String()),
    sa.column("description", sa.String()),
)
role_permissions_table = sa.table(
    "role_permissions",
    sa.column("role_id", sa.UUID()),
    sa.column("permission_id", sa.UUID()),
)


def upgrade() -> None:
    bind = op.get_bind()

    permission_ids: dict[str, uuid.UUID] = {}
    for code, description in PERMISSIONS:
        pid = uuid.uuid4()
        permission_ids[code] = pid
        bind.execute(permissions_table.insert().values(id=pid, code=code, description=description))

    for role_name, codes in ROLE_PERMISSIONS.items():
        role_id = uuid.uuid4()
        bind.execute(
            roles_table.insert().values(
                id=role_id,
                organization_id=None,
                name=role_name,
                description=f"System role: {role_name}",
            )
        )
        for code in codes:
            bind.execute(
                role_permissions_table.insert().values(
                    role_id=role_id, permission_id=permission_ids[code]
                )
            )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(role_permissions_table.delete())
    bind.execute(roles_table.delete().where(roles_table.c.organization_id.is_(None)))
    bind.execute(
        permissions_table.delete().where(
            permissions_table.c.code.in_([code for code, _ in PERMISSIONS])
        )
    )
