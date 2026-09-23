# Testing Strategy

Status: **Proposal.** The current repository has zero automated tests. This defines the test pyramid, tooling, and CI gate for `apps/api` and `apps/web` going forward.

---

## 1. Test pyramid

```
        ▲   Playwright (E2E, critical flows only)         — slowest, fewest
        │   API tests (PyTest + httpx, per module)
        │   Unit tests (PyTest, service/business logic)    — fastest, most
        ▼
```

Business logic is pushed down into `apps/api` service functions specifically so it is unit-testable without spinning up HTTP or a browser — the current codebase can't do this because its logic lives inside Server Actions coupled to Prisma and Next's request lifecycle.

## 2. Backend — PyTest

### 2.1 Unit tests (`apps/api/tests/unit/`)

- Target: service-layer functions (`app/modules/*/service.py`) — pricing calculations, quotation-versioning rules, pipeline-stage transitions, RBAC permission resolution, AI prompt construction.
- Repositories are mocked/faked at this level — unit tests do not touch a real database.
- Framework: `pytest` + `pytest-mock`; `factory_boy` (or plain dataclass builders) for constructing input objects.
- Target: **≥85% line coverage on `service.py` modules**; coverage on `router.py`/`repository.py` is a by-product of API tests (§2.2), not separately chased.

### 2.2 API tests (`apps/api/tests/api/`)

- Target: full request/response cycle through FastAPI's `TestClient`/`httpx.AsyncClient`, against a **real Postgres** test database (a disposable schema/container, not SQLite — SQLite's type/behavior differences from Postgres, e.g. `numeric`/`jsonb`/constraint enforcement, make it an unreliable stand-in for this schema).
- Each test module gets a transactional fixture (wrap the test in a DB transaction, roll back after) so tests don't leak state into each other.
- Coverage: every endpoint gets at least — one happy-path test, one validation-failure test (422), one authorization-failure test (403 for a role lacking the permission), and one not-found/cross-tenant-isolation test (a user from org A cannot fetch org B's resource by id).
- Auth: a small set of pre-seeded test users per role (Sales/Ops/Finance/Management/Admin) as fixtures, so permission tests are declarative (`as_user("sales")`, `as_user("finance")`).

### 2.3 What must be tested before a module is considered "done"

Per module (identity, crm, catalog, sales, finance, comms, ai): unit tests for every non-trivial service function + API tests for every endpoint, **before** the corresponding `apps/web` pages are switched over to it in the strangler-fig migration (`IMPLEMENTATION_ROADMAP.md`). A module does not go live for the frontend without this.

## 3. Frontend

- **Type checking** (`tsc --noEmit`) and **lint** (`eslint`) run on every change — not a substitute for tests, but a mandatory gate (already true of the current MVP; carried forward).
- **Unit tests** (Vitest) for pure logic that lives in `apps/web` despite the backend split — formatters (`formatCurrency`, `formatDate`), the generated API client's response-shape guards, form-schema (Zod) edge cases.
- **Playwright** (`apps/web/e2e/`) for critical UI flows end-to-end, against a running `apps/web` + `apps/api` + test Postgres stack:
  1. Login → dashboard loads with correct role-scoped nav.
  2. Create a lead → log an interaction → move it through pipeline stages.
  3. Create a quotation → build an itinerary (manual path, no external dependency) → accept it → a booking is created.
  4. AI itinerary generation path, with the Anthropic call mocked at the API boundary (no real API spend in CI).
  5. RBAC: a Sales-role user cannot see/access Finance-only screens (invoices/payments); attempting the underlying API call directly returns 403.
  6. Empty/error/loading states render correctly for at least one list view (contract test for the shared `EmptyState`/`ErrorState`/`Skeleton` components, not re-verified per page).
- Playwright runs against desktop and tablet viewport presets (per the responsiveness requirement) for the flows above.

## 4. Test data

- Backend: fixtures/factories per module, composable (`build_account()`, `build_lead(account=...)`, etc.), living in `apps/api/tests/factories/`.
- A shared **seed script** (Alembic data migration or a standalone `seed.py`, org-scoped and idempotent) produces a realistic demo dataset for local dev and for Playwright's target environment — the spiritual successor to today's `prisma/seed.ts`.

## 5. CI gate (Bitbucket Pipelines)

Every push and PR runs:

1. **Backend**: `ruff`/`black --check` (lint/format) → `mypy` (type check, since principle #9 asks for Python type hints throughout) → `pytest tests/unit` → `pytest tests/api` (against a Postgres service container).
2. **Frontend**: `eslint` → `tsc --noEmit` → `vitest run`.
3. **E2E** (separate, slower pipeline stage — on PR-to-main and nightly, not on every commit, to keep inner-loop CI fast): bring up `apps/api` + `apps/web` + Postgres via Compose, run the Playwright suite headless.

A PR cannot merge with a red pipeline. Coverage reports (backend `pytest-cov`, frontend `vitest --coverage`) are published as pipeline artifacts; the ≥85% service-layer target from §2.1 is enforced as a CI check, not just a guideline.

## 6. What changes for the existing MVP in the meantime

Until `apps/api` modules land, the existing Next.js/Prisma code has **no** test coverage and this document does not retroactively demand it be added — effort goes into building the new, tested modules per the roadmap rather than back-filling tests for code that is being replaced. The one exception: if a bug is fixed in the legacy code while it's still live, that fix gets a regression test in whichever suite is easiest to add it to (Vitest, since the legacy code is TypeScript) so it doesn't regress again before its module's migration lands.
