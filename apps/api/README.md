# Travel DMC CRM API (`apps/api`)

FastAPI + SQLAlchemy + PostgreSQL backend for the Travel DMC CRM. See the root
`/docs` for architecture, database, and API design docs — this README is just
setup instructions.

## Stack

- **FastAPI** + **Pydantic v2** — REST API, request/response validation
- **SQLAlchemy 2.x** (sync) + **Alembic** — ORM and migrations
- **PostgreSQL**
- **PyJWT** + **bcrypt** — JWT access/refresh auth, password hashing
- **pytest**, **ruff**, **mypy** (strict) — tests, lint, types

## Getting started

1. **Install dependencies** (uses [uv](https://docs.astral.sh/uv/); `pip install -e ".[dev]"` works too)

   ```bash
   uv venv .venv
   uv pip install -e . --group dev -p .venv/bin/python
   ```

2. **Start Postgres and create the database**

   ```bash
   createdb travel_dmc   # or via docker compose, see root README
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL` and generate a `JWT_SECRET_KEY`:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

4. **Run migrations** (creates the schema and seeds the starter permission/role set)

   ```bash
   .venv/bin/alembic upgrade head
   ```

5. **Seed demo data** (one organization + one user per Phase-1 role — dev/local only)

   ```bash
   .venv/bin/python -m app.seed
   ```

   Logs in as `admin@dmc.dev` / `sales@dmc.dev` / `ops@dmc.dev` / `finance@dmc.dev` /
   `management@dmc.dev`, all with password `password123`.

6. **Run the dev server**

   ```bash
   .venv/bin/uvicorn app.main:app --reload --port 8000
   ```

   Interactive API docs: http://localhost:8000/docs · Health check: http://localhost:8000/health

## Project structure

```
app/core/                 Config, DB session, JWT/password security, error envelope, RBAC
app/modules/identity/     Users, roles, permissions, auth endpoints (Phase 0)
app/seed.py               Idempotent local-dev demo data
alembic/versions/         Schema migrations + the starter-permissions data migration
tests/unit/                Service-layer + security/RBAC logic tests (no DB)
tests/api/                 Full request/response tests against a real test database
```

Every module added for later phases (`crm`, `catalog`, `sales`, `finance`, `comms`, `ai`,
`reporting`) follows the same `router → service → repository → models/schemas` shape —
see `docs/ARCHITECTURE.md` §2.3.

## Testing

```bash
.venv/bin/pytest                              # full suite
.venv/bin/pytest --cov=app --cov-report=term-missing
```

Tests run against a dedicated `travel_dmc_test` database (create it once with
`createdb travel_dmc_test`); each test runs inside a rolled-back transaction so
they never leak state into each other. See `docs/TESTING_STRATEGY.md`.

## Lint & types

```bash
.venv/bin/ruff check .
.venv/bin/ruff format .
.venv/bin/mypy app
```

## Useful commands

| Command | Purpose |
|---|---|
| `alembic revision --autogenerate -m "..."` | Generate a migration from model changes |
| `alembic upgrade head` | Apply all pending migrations |
| `alembic downgrade -1` | Roll back the last migration |
| `python -m app.seed` | Load local demo data (idempotent) |
