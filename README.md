# Travel DMC CRM

Monorepo for a production-grade Travel DMC CRM. See `/docs` for the full architecture,
product, database, API, design-system, testing, and roadmap documentation — start with
`docs/ARCHITECTURE.md` and `docs/IMPLEMENTATION_ROADMAP.md`.

## Layout

```
apps/
  web/    Next.js + TypeScript frontend (shadcn/ui, Tailwind, RHF+Zod)
  api/    FastAPI + SQLAlchemy + Pydantic backend (PostgreSQL)
docs/     Architecture & planning documentation
```

`apps/web` currently also contains the legacy MVP's own data access (Prisma) and auth
(NextAuth), being migrated onto `apps/api` module by module per the strangler-fig plan
in `docs/IMPLEMENTATION_ROADMAP.md`. Each app has its own README with setup instructions
for running it standalone; see below for running the full stack together.

## Running the full stack locally

```bash
docker compose up --build
```

This starts Postgres, `apps/api` (http://localhost:8000, docs at `/docs`), and
`apps/web` (http://localhost:3000). See `apps/api/README.md` and `apps/web/README.md`
for running either service on its own, migrations, and seed data.

## Current status

Phase 0 (foundation) is in progress: monorepo structure, `apps/api` skeleton, the
identity/auth/RBAC module, CI, and the design-system foundation. No user-facing feature
has moved off the legacy `apps/web` implementation yet — see `docs/IMPLEMENTATION_ROADMAP.md`
for the phase-by-phase plan and exit criteria.
