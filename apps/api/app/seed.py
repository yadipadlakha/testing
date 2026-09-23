"""Idempotent local-dev seed: one demo organization + one user per Phase-1
department/role. Not run in production — see docs/DATABASE_DESIGN.md §11
(lookup tables are seeded via Alembic data migrations; this is dev-only
demo data). Run with: python -m app.seed
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.modules.identity.models import Department, Organization, Role, User, UserRole

DEMO_PASSWORD = "password123"

DEMO_USERS = [
    ("admin@dmc.dev", "Ava Admin", Department.ADMIN, "Admin"),
    ("sales@dmc.dev", "Sam Sales", Department.SALES, "Sales"),
    ("ops@dmc.dev", "Olivia Ops", Department.OPERATIONS, "Operations"),
    ("finance@dmc.dev", "Felix Finance", Department.FINANCE, "Finance"),
    ("management@dmc.dev", "Mia Management", Department.MANAGEMENT, "Management"),
]


def seed(db: Session) -> None:
    org = db.execute(
        select(Organization).where(Organization.name == "Demo DMC")
    ).scalar_one_or_none()
    if org is None:
        org = Organization(name="Demo DMC", default_currency="USD", timezone="UTC")
        db.add(org)
        db.flush()
        print(f"Created organization: {org.name} ({org.id})")

    roles_by_name = {
        r.name: r for r in db.execute(select(Role).where(Role.organization_id.is_(None))).scalars()
    }

    for email, full_name, department, role_name in DEMO_USERS:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing is not None:
            print(f"Skipping existing user: {email}")
            continue

        user = User(
            organization_id=org.id,
            email=email,
            password_hash=hash_password(DEMO_PASSWORD),
            full_name=full_name,
            department=department,
        )
        db.add(user)
        db.flush()

        role = roles_by_name[role_name]
        db.add(UserRole(user_id=user.id, role_id=role.id))
        print(f"Created user: {email} / {DEMO_PASSWORD} (role: {role_name})")

    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
