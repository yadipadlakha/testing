from __future__ import annotations

import os
import uuid
from collections.abc import Generator

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from alembic import command

TEST_DATABASE_URL = "postgresql+psycopg://travel:travel@localhost:5432/travel_dmc_test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ENVIRONMENT", "test")

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.core.db import get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.identity.models import Department, Organization, Role, User, UserRole  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _migrated_test_db():
    """Applies every Alembic migration (schema + seeded permissions/roles) once
    per test session, against the dedicated test database.
    """
    cfg = Config(str(__import__("pathlib").Path(__file__).parent.parent / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(scope="session")
def _engine():
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(_engine) -> Generator[Session, None, None]:
    """Each test runs inside an outer transaction that is rolled back at the
    end, so tests never leak state into each other (docs/TESTING_STRATEGY.md §2.2).

    Code under test (service/router functions) calls session.commit() as it
    normally would in production. To let that happen without ending the outer
    transaction, we run inside a SAVEPOINT and transparently restart it every
    time the session's transaction ends — the standard SQLAlchemy pattern for
    "join a session into an external transaction."
    """
    connection = _engine.connect()
    outer_transaction = connection.begin()
    TestSessionLocal = sessionmaker(
        bind=connection, autoflush=False, autocommit=False, expire_on_commit=False
    )
    session = TestSessionLocal()

    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def _override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    # base_url must contain a dot: httpx's default "testserver" host confuses
    # the stdlib cookiejar's domain matching (it stores Set-Cookie against a
    # synthesized "testserver.local" but matches outgoing requests against
    # bare "testserver", so cookies — our refresh token — never get resent).
    with TestClient(app, base_url="http://testserver.local") as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db_session: Session):
    """Factory fixture: make_user(role_name="Sales") -> (User, plaintext_password, Organization)."""

    password = "test-password-123"

    def _make(
        role_name: str = "Sales", *, department: Department | None = None
    ) -> tuple[User, str, Organization]:
        org = Organization(
            name=f"Test Org {uuid.uuid4().hex[:8]}", default_currency="USD", timezone="UTC"
        )
        db_session.add(org)
        db_session.flush()

        role = (
            db_session.query(Role)
            .filter(Role.name == role_name, Role.organization_id.is_(None))
            .one()
        )
        resolved_department = department or Department.__members__.get(
            role_name.upper(), Department.ADMIN
        )

        user = User(
            organization_id=org.id,
            email=f"{uuid.uuid4().hex[:12]}@test.dev",
            password_hash=hash_password(password),
            full_name=f"Test {role_name}",
            department=resolved_department,
        )
        db_session.add(user)
        db_session.flush()
        db_session.add(UserRole(user_id=user.id, role_id=role.id))
        db_session.flush()
        db_session.commit()

        return user, password, org

    return _make
