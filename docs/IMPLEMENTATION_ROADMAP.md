# Implementation Roadmap

Status: **Proposal — awaiting go-ahead.** No phase below has started. Each phase lists objectives, deliverables, and an explicit exit criterion; a phase is not "done" until its exit criterion is met, per the testing gate in `TESTING_STRATEGY.md`.

---

## Phase 0 — Foundation (no new business features)

**Objective**: stand up the target architecture without changing what users can already do.

- Restructure the repo into the monorepo layout from `ARCHITECTURE.md` §2.6: move the existing Next.js app into `apps/web/` unchanged (mechanical move, verified by a green build before/after).
- Scaffold `apps/api`: FastAPI app skeleton, `core/` (config via Pydantic `BaseSettings`, DB session, error-envelope exception handlers, pagination helpers), Alembic wired to a local Postgres.
- Identity module in `apps/api`: `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `audit_logs` tables + the auth endpoints from `API_DESIGN.md` §5 + `require_permission` dependency.
- Seed: one organization, the five Phase-1 roles (Sales/Ops/Finance/Management/Admin) with a sensible starting permission set, one user per role.
- shadcn/ui installed in `apps/web`, themed to the tokens in `UI_DESIGN_SYSTEM.md` §1; AppShell (top nav + sidebar + breadcrumbs) rebuilt on it.
- CI: `bitbucket-pipelines.yml` running lint/typecheck for both apps + the backend unit/API test stages (empty suite is fine initially, but the gate exists from commit one).
- Docker: a Dockerfile per app; local Compose brings up Postgres + `apps/api` + `apps/web` together.
- **Existing MVP behavior is untouched and still runs** — this phase adds scaffolding beside it, it does not migrate any feature yet.

**Exit criterion**: a developer can `docker compose up`, log in as a seeded user against the *new* auth (`apps/api`), and see an empty-but-themed AppShell in `apps/web`; CI is green on an empty test suite; the old app still runs unmodified.

---

## Phase 1 — Core CRM & Sales parity (the strangler-fig cutover)

**Objective**: rebuild today's MVP functionality on the new stack, module by module, with tests, before adding anything new.

Order (each step: build the `apps/api` module + tests → switch the corresponding `apps/web` pages to call it → delete the superseded Prisma models/Server Actions):

1. **CRM module**: `accounts`, `contacts`, `pipelines`, `pipeline_stages`, `leads`, `interactions`, `interaction_types`. Migrates today's `Client`/`Interaction`. UI: Leads list/detail, replacing `/clients`.
2. **Sales module (quotation + itinerary)**: `quotations`, `quotation_versions`, `quotation_statuses`, `itineraries`, `itinerary_days`, `itinerary_activities`, `activity_categories`. Migrates today's `Trip`/`Itinerary`. UI: Quotations list/detail with the manual itinerary builder (parity with today) — replacing `/trips`.
3. **AI module**: wraps the existing Claude tool-use logic from `src/lib/ai/itinerary.ts` as an `apps/api` service with generation logging (`API_DESIGN.md` §6). UI: "Generate with AI" reconnected to the new endpoint.
4. **Bookings**: `bookings`, `booking_statuses`, `booking_travelers`, `booking_documents`, plus the `quotations/{id}/accept` endpoint. This is new relative to today's MVP (today's `Trip.status` conflates quote and booking) — ships in this phase because Sales/Ops need it to consider Phase 1 "core parity plus."
5. **Dashboard**: rebuilt against the new API's aggregate endpoints.
6. **Admin**: user/role management UI, audit log viewer.
7. Delete `prisma/`, the old `src/lib/actions/*`, and `next-auth` once every page above is migrated and its Playwright flow (`TESTING_STRATEGY.md` §3) is green.

**Exit criterion**: every flow in today's MVP (signup/login, lead pipeline, quotation + itinerary — manual and AI, dashboard) works end-to-end on `apps/api`, with unit + API + Playwright coverage; zero references to Prisma or Server Actions remain; RBAC is enforced (Sales/Ops/Finance/Management/Admin see the correct nav and are 403'd server-side on out-of-scope endpoints).

---

## Phase 2 — Catalog & Inventory

- Resolve the open question in `PRODUCT_REQUIREMENTS.md` §6.1 (first-party vs. integrated hotel CRS) **before** building `hotel_inventory` — this materially changes the module's shape.
- Build `destinations`, `suppliers`, `hotels`/`hotel_room_types`/`hotel_rate_plans`/`hotel_inventory`, `activities_catalog`/`activity_inventory`, `transport_options`/`transport_inventory`.
- Link `itinerary_activities.supplier_id` and `itinerary_days.location_destination_id` once these exist (both nullable-until-now per `DATABASE_DESIGN.md` §5).
- UI: Supplier management, inventory calendars (date-grained availability), itinerary builder gains "pick from catalog" alongside free-text entry (free-text remains supported — not every activity will have a catalog entry on day one).

**Exit criterion**: an itinerary line can be built either from free text (today's capability, preserved) or from live catalog inventory with real rates; supplier CRUD + inventory CRUD have full test coverage.

---

## Phase 3 — Finance

- Resolve the payment-gateway open question (`PRODUCT_REQUIREMENTS.md` §6.2) before building the `payments` capture flow.
- Build `invoices`/`invoice_line_items`, `payments`, `supplier_bills`, `currencies`, `fx_rates`.
- Idempotency-key handling on payment-capture endpoints (`API_DESIGN.md` §7).
- UI: Finance dashboards (receivables/payables aging), invoice generation from a booking, payment recording.

**Exit criterion**: a booking can be invoiced, paid (partially or fully), and its payment status is reflected on the booking/quotation without manual reconciliation; no card data is ever persisted in this system's own database.

---

## Phase 4 — Reporting & Analytics

- Cross-module aggregate endpoints (`/reports/*`) built against the by-then-stable Sales/Catalog/Finance schemas — deliberately sequenced last among the "internal" phases so reports aren't built against a schema that's still shifting.
- UI: dashboards per department (Sales pipeline/conversion, Ops upcoming departures, Finance aging, Management cross-cutting), CSV export.

**Exit criterion**: each of the five Phase-1 roles has at least one dashboard view answering their stated need from `PRODUCT_REQUIREMENTS.md` §2.

---

## Phase 5 — Communications

- `email_templates`/`whatsapp_templates`, `email_log`/`whatsapp_log`, `notifications`.
- Integrate a transactional email provider and a WhatsApp Business API/BSP per the decision in `PRODUCT_REQUIREMENTS.md` §6.3.
- Trigger points: quotation sent, booking confirmed, payment received/overdue reminder — wired as domain events from the `sales`/`finance` services into `comms`, not hardcoded into route handlers.

**Exit criterion**: the three trigger points above reliably send and log a message through both channels in a staging environment.

---

## Phase 6 — External portals

- `external_principals`, `aud`-scoped JWTs (already designed for in Phase 0's auth work — this phase turns it on for real external users).
- B2B agent portal: own quotation requests, own booking pipeline, commission visibility — same `apps/api`, a new route surface scoped to `aud: "b2b-portal"` permissions.
- B2C customer portal: view/pay/confirm own bookings.
- Supplier portal: manage own allocations, see own payment status.

**Exit criterion**: each external principal type can authenticate and can only ever see/act on data belonging to their own linked account — verified by dedicated cross-tenant/cross-principal API tests (`TESTING_STRATEGY.md` §2.2) before this phase is considered safe to expose externally.

---

## Phase 7 — AI expansion

- `ai/quotation/generate`: price + itinerary generation together, building on the Phase-1 `ai` module.
- Extend AI itinerary generation to B2B/B2C flows from Phase 6, with per-principal-type rate limiting and generation-cost tracking (`API_DESIGN.md` §6).

**Exit criterion**: AI generation is available from at least one external portal with the same audit/cost tracking as the internal path, and with abuse/rate controls appropriate to an unauthenticated-adjacent surface.

---

## Cross-cutting: technical debt payoff map

| Debt item (`ARCHITECTURE.md` §1.5) | Resolved in |
|---|---|
| No API layer | Phase 0 |
| No RBAC / audit logging | Phase 0 |
| No tests | Phase 0 (gate established), enforced every phase after |
| Client conflates lead/contact/account | Phase 1 |
| Trip conflates quotation/booking | Phase 1 |
| No supplier/inventory domain | Phase 2 |
| No finance domain | Phase 3 |
| UI not on requested design system | Phase 0 |
| No infra/CI | Phase 0 |
| Backend language/stack mismatch | Phases 0–1 (module by module) |

## Sequencing rule

**No phase starts its UI work until the prior phase's `apps/api` module has met the exit criterion in `TESTING_STRATEGY.md` §2.3.** This is what keeps the migration a strangler fig rather than a second unfinished rewrite sitting next to the first.

---

*Next step per the current instruction: stop here. Await explicit go-ahead before starting Phase 0.*
