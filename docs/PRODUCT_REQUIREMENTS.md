# Product Requirements

Status: **Proposal.** Defines what the system must do, for whom, and in what order. Pairs with `IMPLEMENTATION_ROADMAP.md` for sequencing.

---

## 1. Product summary

A production-grade **Travel DMC (Destination Management Company) CRM**, starting as an internal operations tool for Sales, Operations, Finance, Management, and Admin, architected from day one to extend to B2B travel agents, B2C customers, and supplier-facing portals without a rewrite.

## 2. Users & roles (Phase 1 scope)

| Role | Department | Primary needs |
|---|---|---|
| **Admin** | Admin | User/role management, org settings, full access, audit review |
| **Sales** | Sales | Leads/accounts, quotations, itinerary building, converting quotes to bookings |
| **Operations** | Operations | Booking execution, supplier coordination, inventory/availability, vouchers |
| **Finance** | Finance | Invoices, payments, supplier bills, receivables/payables, currency handling |
| **Management** | Management | Cross-team dashboards, reporting/analytics, approvals (e.g. discount/quote approval), no day-to-day data entry |

**Future roles (post-Phase 1, architected for now, not built now):**

| Role | Notes |
|---|---|
| B2B Travel Agent | External principal, own portal, restricted to their own bookings/quotations, agent-tier pricing |
| B2C Customer | External principal, self-service booking/itinerary view, payment |
| Supplier | External principal, restricted to their own inventory/allocations/bookings and payment status |

A single RBAC engine (see `ARCHITECTURE.md` §2.7, `DATABASE_DESIGN.md` §Identity) serves all of the above via `principal_type` + role/permission assignment — no separate auth system per audience.

## 3. Functional scope by phase

### Phase 1 — Core CRM & Sales (rebuild of today's MVP, extended)

- User/role/department management (Admin)
- Accounts (companies — including future B2B agents) and Contacts (individuals), replacing today's single `Client` table
- Leads with a **configurable** pipeline (not a hardcoded enum) and interaction timeline
- Quotations (versioned, multi-itinerary-option capable) superseding today's "Trip" concept
- Itinerary builder: manual (as shipped today) and AI-assisted (as shipped today, formalized as an `ai` service)
- Quotation → Booking conversion with its own status lifecycle, independent of the quotation's lifecycle
- Dashboard: pipeline, bookings, revenue, upcoming departures — rebuilt on the new API
- Audit log viewer (Admin/Management)

### Phase 2 — Catalog & Inventory

- Suppliers (hotels, DMC ground operators, activity vendors, transport vendors)
- Hotel inventory/rates (own CRS or hotel-mapping layer — see Open Questions)
- Activity inventory
- Transport inventory
- Destination master data, used to scope multi-destination operations

### Phase 3 — Finance

- Invoices (client-facing) and Supplier bills (payable)
- Payments (received/paid), multi-currency, FX rate handling
- Receivables/payables aging views

### Phase 4 — Reporting & Analytics

- Cross-module dashboards (sales performance, booking pipeline, revenue by destination/agent, supplier spend)
- Exportable reports (CSV/PDF)

### Phase 5 — Communications

- Email integration (transactional: quote sent, booking confirmed, payment reminder; templated)
- WhatsApp Business API integration (same event set + conversational updates)
- In-app notification center

### Phase 6 — External portals

- B2B agent portal: quote requests, their own booking pipeline, commission visibility
- B2C customer portal: view/pay/confirm bookings, view itinerary
- Supplier portal: allocation/availability updates, booking confirmations, payment status

### Phase 7 — AI expansion

- AI quotation generation (price + itinerary together, not just itinerary)
- AI itinerary generation available to internal, B2B, and (curated) B2C flows
- Generation history/audit, cost tracking per generation

Exact sequencing, dependencies, and technical debt payoff per phase are in `IMPLEMENTATION_ROADMAP.md`.

## 4. Non-functional requirements

| Category | Requirement |
|---|---|
| Availability | Business-hours-critical (internal users across time zones for multi-destination ops); target 99.5%+ once past Phase 1 |
| Performance | List views (leads, quotations, bookings) usable at 10k+ rows via server-side pagination/filtering, not client-side loading of full tables |
| Security | RBAC enforced server-side on every endpoint; audit trail on every state-changing action in CRM/Sales/Finance/Identity; secrets only via environment variables; passwords hashed (bcrypt/argon2), never logged |
| Accessibility | WCAG 2.1 AA-oriented: keyboard navigable, sufficient color contrast (validated against the given palette — see `UI_DESIGN_SYSTEM.md`), semantic HTML, focus states, screen-reader labels on icon-only controls |
| Responsiveness | Desktop and tablet are first-class (per explicit requirement); mobile phone is out of scope for the internal app but not precluded for future B2C |
| Internationalization readiness | Multi-currency and multi-destination are in scope by Phase 2/3; full i18n (translated UI strings) is **not** in Phase 1–4 scope but the data model (currency codes, timezone-aware dates) must not block it later |
| Data integrity | Foreign-key-enforced relations, DB-level constraints for money/currency pairing, Alembic-versioned schema, no destructive migrations without a reviewed plan |
| Observability | Structured request logs with correlation IDs; audit log distinct from application logs (business record, not debug record) |

## 5. Explicit non-goals (for now)

- No native mobile app.
- No real-time chat/collaboration features beyond WhatsApp/email integration.
- No public marketing site (out of scope for this CRM repo).
- No multi-language UI in Phase 1–4.
- No offline mode.

## 6. Open questions to resolve before Phase 2 (Catalog/Inventory) design work starts

1. **Hotel CRS**: build a first-party rates/inventory engine, or integrate a third-party channel manager/GDS (e.g. via an XML/JSON API)? This materially changes the `catalog` module's schema and service complexity.
2. **Payment gateway**: which processor(s) per operating region (affects `finance` module's payment-method schema and PCI-scope decisions — recommendation: never store card data directly, use a gateway's tokenization).
3. **WhatsApp provider**: direct WhatsApp Business API vs. a BSP (e.g. Twilio, 360dialog) — affects `comms` module integration shape and cost model.
4. **Multi-destination org shape**: are destinations independent legal entities (separate books) or one entity with destination tagging? Affects whether `organization_id` needs a real hierarchy (`organization → branch → destination`) or a flat tag.

These are flagged, not blocking, for Phase 1.
