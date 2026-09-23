# Architecture

Status: **Proposal — not yet implemented.** This document describes the current state of the repository as of `e9c3779` and the target architecture for the Travel DMC CRM. No application code changes accompany this document.

---

## 1. Current State Audit

### 1.1 What exists today

The repository currently contains a single Next.js application ("Voyager") — a monolith that serves both UI and data access in one process. There is no separate backend service, no Python code, and no `/docs` prior to this change.

| Layer | Current implementation |
|---|---|
| Frontend framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, hand-rolled UI primitives (`src/components/ui/*`) — not shadcn/ui |
| Forms | Native HTML forms + Server Actions; server-side Zod validation only (no React Hook Form, no client-side Zod resolvers) |
| Data access | Prisma ORM 6.x, called directly from Server Actions and Server Components |
| Database | PostgreSQL (schema at `prisma/schema.prisma`) |
| Auth | Auth.js / NextAuth v5 (beta), Credentials provider, JWT session, bcrypt password hashing |
| AI | `@anthropic-ai/sdk` called directly from a server action (`src/lib/ai/itinerary.ts`), tool-use for structured itinerary JSON |
| Charts | Recharts |
| API surface | **None**, besides the NextAuth route handler (`/api/auth/[...nextauth]`). All reads/writes go through Server Actions, which are not callable by anything other than this Next.js app |
| Tests | **None** (no PyTest, no Jest/Vitest, no Playwright) |
| Infra | `docker-compose.yml` for local Postgres only; no Dockerfile for the app; no CI pipeline (no `bitbucket-pipelines.yml`) |
| Multi-tenancy | Single `Agency` row per tenant, every table has an `agencyId` foreign key filtered in application code (no DB-level row security) |

### 1.2 Existing modules

| Module | What it does | Where |
|---|---|---|
| Auth & accounts | Agency signup (creates Agency + first ADMIN user), login/logout, JWT session with `id`/`agencyId`/`role` claims | `src/auth.ts`, `src/lib/actions/auth-actions.ts`, `src/app/(auth)/*` |
| CRM — Clients | Leads/clients with a fixed pipeline enum (`NEW_LEAD…LOST`), interaction timeline (call/email/meeting/whatsapp/note) | `src/lib/actions/client-actions.ts`, `src/app/(app)/clients/*` |
| Trips | A booking-ish record (destination, dates, travelers, budget, status enum `INQUIRY…CANCELLED`) linked to one client | `src/lib/actions/trip-actions.ts`, `src/app/(app)/trips/*` |
| Itinerary — AI | Claude tool-use call generates a structured day/activity plan, persisted 1:1 with a Trip | `src/lib/ai/itinerary.ts`, `generateTripItinerary` action |
| Itinerary — manual | Hand-built alternative to AI generation: add/remove days and activities with no external dependency | `src/lib/actions/itinerary-actions.ts` |
| Dashboard | Aggregate stats (client count, active bookings, pipeline value, upcoming trips) + two bar charts | `src/app/(app)/dashboard/page.tsx` |

### 1.3 Existing database structure (Prisma)

`Agency 1—N User`, `Agency 1—N Client`, `Client 1—N Interaction`, `Client 1—N Trip`, `Trip 1—1 Itinerary`, `Itinerary 1—N ItineraryDay`, `ItineraryDay 1—N ItineraryActivity`. Enums: `Role {ADMIN, AGENT}`, `LeadStage`, `TripStatus`, `InteractionType`, `ActivityCategory`. Full detail and the target replacement schema are in `DATABASE_DESIGN.md`.

### 1.4 Reusable building blocks worth carrying forward

- **Domain shape**: the Client → Interaction → Trip → Itinerary → Day → Activity chain maps cleanly onto the target Lead/Account → Quotation → Itinerary → Day → Activity chain. The *concepts* are reusable even though the *implementation* (Prisma models, TS types) will be rebuilt in SQLAlchemy.
- **AI itinerary prompt/tool-schema** (`src/lib/ai/itinerary.ts`): the Claude tool-use contract (structured day/activity JSON) is provider logic, not persistence logic — it ports directly into a FastAPI service function.
- **Visual layer**: the sidebar + sticky content shell, stat cards, badge-driven status display, and bar-chart dashboard pattern are the right *shapes* for the enterprise SaaS UI requested; they will be rebuilt on shadcn/ui primitives against the new design tokens (see `UI_DESIGN_SYSTEM.md`) rather than reused as-is.

### 1.5 Technical debt

1. **No API layer.** Every read/write is a Next.js Server Action, callable only from this app's own forms. This blocks every future external consumer named in scope (B2B agents, B2C customers, supplier portals, mobile, integrations).
2. **No RBAC.** Two hardcoded roles (`ADMIN`, `AGENT`) with no permission granularity, no departments (Sales/Ops/Finance/Management), and authorization checks are ad hoc (`if (session.user.role !== "ADMIN")`) rather than centrally enforced.
3. **No audit logging.** No record of who changed what, when — required for a Finance/Ops system of record.
4. **No tests at any level.** No regression safety net for a rewrite or for ongoing feature work.
5. **Domain model is CRM-only, not DMC-operational.** `Client` conflates "lead," "traveler," and (implicitly) "B2B account" into one table. `Trip` conflates "quotation" and "booking" into one status enum with no supplier, inventory, invoice, or payment concept.
6. **No supplier/inventory/finance/comms domains exist at all** — these are 100% greenfield per the requested scope (Hotel CRS, Activity/Transport inventory, Payments, WhatsApp/Email, Reporting).
7. **UI is not on the requested design system.** Hand-rolled primitives, indigo default palette, no design tokens, no React Hook Form/Zod client-side validation, no command palette, no drawers.
8. **No infrastructure-as-code, containerization of the app, or CI/CD.** Only local Postgres via Compose.
9. **Language/stack mismatch with the requested backend.** The current backend logic is TypeScript/Prisma; the target is Python/FastAPI/SQLAlchemy. This is the central architectural decision this document resolves (§3).

### 1.6 Missing architecture (relative to the requested scope)

- No separation between frontend and backend processes/deployables.
- No REST API contract, versioning, or OpenAPI spec.
- No RBAC/permission model, no audit trail, no multi-role-per-department structure.
- No supplier, inventory (hotel/activity/transport), booking, invoice, or payment schema.
- No integration surface for email/WhatsApp.
- No B2B/B2C-facing authentication boundary (internal-only today).
- No AI service abstraction (today it's one function tied to one form).
- No test pyramid, no CI, no containerized deployment path to AWS.

---

## 2. Target Architecture

### 2.1 Style

**Decoupled two-tier architecture**, per the requested stack:

- **Frontend service** (`apps/web`): Next.js + TypeScript. Presentation, routing, client-side state, form UX (React Hook Form + Zod), calling the backend exclusively over REST/JSON. No direct database access, no ORM, no business logic beyond view-model shaping.
- **Backend service** (`apps/api`): FastAPI + SQLAlchemy + Pydantic + PostgreSQL. Owns all business logic, persistence, authorization, validation, audit logging, AI orchestration, and integrations (email/WhatsApp/payments/suppliers). Exposes a versioned REST API (`/api/v1/...`) as the **only** way to reach the database.

This is the architecture that scales to the full stated roadmap: any future consumer (B2B extranet, B2C site, mobile app, partner integration) is just another client of the same API, with scopes/roles controlling what it can see.

### 2.2 High-level component diagram

```
                         ┌─────────────────────────────┐
                         │        apps/web (Next.js)    │
                         │  Server Components + Client  │
                         │  RHF+Zod forms, shadcn/ui     │
                         └───────────────┬──────────────┘
                                         │ HTTPS / JSON (REST, versioned)
                                         │ Bearer JWT (access token)
                         ┌───────────────▼──────────────┐
                         │        apps/api (FastAPI)     │
                         │  Routers → Services → Repos   │
                         │  Pydantic schemas, RBAC deps   │
                         │  Audit logging middleware      │
                         └───────┬───────────────┬───────┘
                                 │               │
                  ┌──────────────▼───┐   ┌───────▼─────────────┐
                  │   PostgreSQL      │   │ External services    │
                  │ (SQLAlchemy ORM,  │   │ Claude API, Email,   │
                  │  Alembic migrat.) │   │ WhatsApp Business API,│
                  └───────────────────┘   │ Payment gateway       │
                                          └───────────────────────┘
```

### 2.3 Service boundaries within `apps/api`

Organized as **modules by business domain**, each internally layered `router → service → repository → model`:

| Module | Owns |
|---|---|
| `identity` | Users, roles, permissions, departments, sessions, audit log |
| `crm` | Accounts (companies incl. B2B agents), Contacts (individuals), Leads, Interactions, Pipelines |
| `catalog` | Suppliers, Destinations, Hotels + rate/inventory, Activities + inventory, Transport + inventory |
| `sales` | Quotations, Itineraries, Itinerary days/activities, Bookings |
| `finance` | Invoices, Payments, Supplier bills, Currencies/FX |
| `comms` | Email log/templates, WhatsApp log/templates, Notifications |
| `ai` | Quotation/itinerary generation service (wraps Claude API), prompt templates, generation audit |
| `reporting` | Cross-module read models / aggregation endpoints |
| `core` | Shared: config, DB session, pagination, error envelope, base repository, audit decorator |

Each module is a Python package (`app/modules/<name>/{router,service,repository,models,schemas}.py`). No module imports another module's repository directly — cross-module reads go through that module's service layer, keeping boundaries enforceable ahead of a future extraction into separate services if scale requires it.

### 2.4 Why a monorepo, and why not rewrite from scratch

- **Monorepo** (`apps/web`, `apps/api`, shared `docs/`, `infra/`) keeps versioning, CI, and local dev simple for a team this size, while still enforcing the process boundary that matters (frontend never touches the DB).
- **Strangler-fig migration, not a rewrite-and-swap.** The existing Next.js app is a working MVP with a seeded, demoed data model. Recommendation: keep it running (or keep its UI shell) while `apps/api` is built module-by-module; each Next.js page is switched from Server Actions/Prisma to REST calls against the new API as its module goes live in `apps/api`, per the phased plan in `IMPLEMENTATION_ROADMAP.md`. Prisma and the Server Actions are deleted only once every page has migrated and parity is confirmed by tests. This avoids a long-lived feature freeze and gives continuous, demoable progress.

### 2.5 Cross-cutting concerns

- **Config & secrets**: all secrets (DB URL, JWT signing key, Anthropic key, SMTP/WhatsApp credentials, payment gateway keys) via environment variables, loaded through Pydantic `BaseSettings` in `apps/api` and Next.js server-only env access in `apps/web`. Nothing committed to the repo; `.env.example` per app documents required keys.
- **Logging**: structured JSON logs (Python `logging` + `structlog` or equivalent) in `apps/api`, correlated by a `request_id` generated per request and echoed in the response envelope and error payloads. Next.js logs are minimal (render/route errors only) since business logic no longer lives there.
- **Audit logging**: a dedicated `audit_log` table (actor, action, entity type/id, before/after diff, timestamp, IP) written by a service-layer decorator/helper on every state-changing endpoint in `crm`, `sales`, `finance`, and `identity`. Not optional — required by principle #16 and by Finance/Ops needs.
- **RBAC**: enforced in `apps/api` only, via a FastAPI dependency (`require_permission("bookings:approve")`) resolved from the caller's JWT roles → permissions. `apps/web` never makes an authorization decision itself; it renders based on permissions the API tells it the current user has (returned on `/me`).
- **Multi-tenancy / multi-destination**: generalize today's single `agency_id` filter into an `organization_id` (the DMC) plus an optional `branch_id`/`destination_id` for multi-destination operations, both enforced at the repository layer (every query scoped, no reliance on the caller to remember).
- **API versioning**: URL-path versioned (`/api/v1/...`) from day one, since B2B/B2C/partner integrations will eventually depend on stability.

### 2.6 Target folder structure

See `IMPLEMENTATION_ROADMAP.md` §Phase 0 for the concrete migration steps; the target layout is:

```
/
├── apps/
│   ├── web/                     # Next.js app (today's root, moved here)
│   │   ├── src/
│   │   │   ├── app/             # routes (App Router)
│   │   │   ├── components/      # shadcn/ui + feature components
│   │   │   ├── lib/
│   │   │   │   ├── api/         # typed REST client (generated from OpenAPI)
│   │   │   │   ├── auth/        # session/token handling (calls apps/api)
│   │   │   │   └── utils/
│   │   │   └── hooks/
│   │   └── e2e/                 # Playwright specs
│   └── api/                     # FastAPI app (new)
│       ├── app/
│       │   ├── main.py
│       │   ├── core/            # config, db session, security, errors, pagination
│       │   ├── modules/
│       │   │   ├── identity/
│       │   │   ├── crm/
│       │   │   ├── catalog/
│       │   │   ├── sales/
│       │   │   ├── finance/
│       │   │   ├── comms/
│       │   │   ├── ai/
│       │   │   └── reporting/
│       │   └── migrations/      # Alembic
│       └── tests/
│           ├── unit/
│           └── api/
├── infra/
│   ├── docker/                  # Dockerfiles per app
│   ├── compose/                 # local dev docker-compose
│   └── aws/                     # IaC (later phase)
├── bitbucket-pipelines.yml
└── docs/
    ├── ARCHITECTURE.md
    ├── PRODUCT_REQUIREMENTS.md
    ├── UI_DESIGN_SYSTEM.md
    ├── DATABASE_DESIGN.md
    ├── API_DESIGN.md
    ├── TESTING_STRATEGY.md
    └── IMPLEMENTATION_ROADMAP.md
```

### 2.7 Authentication & authorization (summary — full detail in `API_DESIGN.md` §Auth)

- `apps/api` issues a short-lived JWT **access token** (~15 min) and a longer-lived **refresh token**, the latter set as an `httpOnly`, `Secure`, `SameSite=Lax` cookie scoped to the API domain.
- `apps/web` never reads the refresh token; it holds the access token server-side (per request) and refreshes via a proxied call when expired.
- RBAC model: `User —N:M— Role —N:M— Permission`, permissions named `<module>:<action>` (e.g. `sales.quotation:approve`). A `department` field on `User` (Sales/Ops/Finance/Management/Admin) drives default role assignment but is not itself the authorization check.
- Forward-compatible for B2B/B2C: a `principal_type` claim (`INTERNAL`, `B2B_AGENT`, `B2C_CUSTOMER`, `SUPPLIER`) plus an `audience` claim keeps external tokens cryptographically distinct from internal ones, even though they flow through the same auth service and permission engine.

### 2.8 Testing strategy (summary — full detail in `TESTING_STRATEGY.md`)

PyTest for unit tests (service-layer business logic, mocked repositories) and API tests (httpx against a test DB per module); Playwright for the critical UI flows (login, lead → quotation → booking, itinerary generation, dashboard); both wired into Bitbucket Pipelines so nothing merges without green tests.

---

## 3. Decision Record

| Decision | Choice | Rationale |
|---|---|---|
| Backend rewrite vs. extend Prisma | Rewrite backend on FastAPI/SQLAlchemy, keep Next.js as pure frontend | Explicit tech stack requirement; also the only way to serve future non-Next.js consumers (B2B/B2C/mobile) from one authoritative API |
| Monorepo vs. polyrepo | Monorepo (`apps/web`, `apps/api`) | Single team, shared release cadence today; module boundaries inside `apps/api` keep a future split viable |
| Rewrite-and-swap vs. strangler fig | Strangler fig, module by module, per `IMPLEMENTATION_ROADMAP.md` | Avoids a long feature freeze; existing MVP keeps demoing while new modules land |
| UI kit | shadcn/ui on Tailwind, tokens from the supplied palette | Explicit requirement; also removes today's ad hoc indigo theme |
| Auth | FastAPI-issued JWT (access + refresh), RBAC in the API only | Needed once there is a real API boundary; supports future external principals cleanly |
