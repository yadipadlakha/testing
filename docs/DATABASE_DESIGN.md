# Database Design

Status: **Proposal.** PostgreSQL throughout. Target ORM: SQLAlchemy 2.x (declarative models) + Alembic migrations in `apps/api`. No migration has been run against this design yet.

---

## 1. Current schema (as shipped, Prisma)

For reference — this is what exists today and what the target schema supersedes (see §5 for the mapping).

| Model | Key fields | Relationships |
|---|---|---|
| `Agency` | name | 1—N User, Client, Trip |
| `User` | name, email (unique), passwordHash, role (`ADMIN`\|`AGENT`) | N—1 Agency |
| `Client` | name, email, phone, source, stage (enum), notes | N—1 Agency, N—1 User (owner), 1—N Interaction, 1—N Trip |
| `Interaction` | type (enum), subject, content, occurredAt | N—1 Client, N—1 User |
| `Trip` | title, destination, startDate, endDate, travelers, budgetAmount, currency, status (enum) | N—1 Agency, N—1 Client, N—1 User (owner), 1—1 Itinerary |
| `Itinerary` | generatedByAi, prompt, summary, totalEstimatedCost, currency | 1—1 Trip, 1—N ItineraryDay |
| `ItineraryDay` | dayNumber, date, title, location | N—1 Itinerary, 1—N ItineraryActivity |
| `ItineraryActivity` | order, startTime, title, description, location, category (enum), estimatedCost, currency, durationMinutes | N—1 ItineraryDay |

Limitations driving the redesign: `Client` conflates lead/contact/account; `Trip` conflates quotation/booking; no supplier/inventory/finance/comms/identity(RBAC)/audit tables exist.

---

## 2. Conventions (apply to every table below)

- **Primary keys**: UUID (`uuid`, generated `gen_random_uuid()` via `pgcrypto`), not surrogate integers — safe to expose to future B2B/B2C/partner APIs without leaking sequence/volume information.
- **Timestamps**: every table has `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()` (updated via SQLAlchemy `onupdate`). Business-date fields (e.g. travel dates) are `date`, not `timestamptz`.
- **Soft delete**: tables that represent business records the user can "remove" (Accounts, Contacts, Leads, Quotations, Bookings) get `deleted_at timestamptz null` rather than hard delete, so financial/audit history stays intact. Pure line-item/child tables (activities, invoice lines) hard-delete with their parent.
- **Money**: always a `numeric(12,2)` amount column **paired with** a `currency char(3)` column (ISO 4217) on the same row — never a bare float, never an amount without its currency alongside it.
- **Multi-tenancy**: every business table carries `organization_id` (renamed from today's `agency_id` — the DMC's own tenant boundary) and is queried through a repository layer that always filters by it. Tables that scope further to a destination/branch also carry `branch_id` (nullable until Phase-2 multi-destination work lands).
- **Enums**: modeled as **lookup tables**, not native Postgres enums or hardcoded application enums — pipelines, statuses, and categories must be configurable per organization (a requirement the current hardcoded-enum design violates). Native DB enums are only used for truly fixed, code-level concepts (e.g. `principal_type`).
- **Naming**: snake_case tables and columns, singular-domain/plural-table (e.g. `accounts`, `quotation_line_items`).
- **Auditability**: every insert/update/delete on a business table (see full list in §7) is mirrored into `audit_logs` by a service-layer helper — not a DB trigger, so the audit entry can carry the acting user and a human-readable diff.

---

## 3. Domain: Identity & Access

| Table | Key columns | Notes |
|---|---|---|
| `organizations` | name, legal_name, default_currency, timezone | The DMC tenant. Single row for Phase 1; multiple rows only if the product is ever sold to more than one DMC. |
| `branches` | organization_id, name, destination_id (nullable) | Multi-destination office/branch; optional until Phase 2. |
| `users` | organization_id, email (unique), password_hash, full_name, department (`SALES`\|`OPERATIONS`\|`FINANCE`\|`MANAGEMENT`\|`ADMIN`), principal_type (`INTERNAL` default), is_active, last_login_at | Department drives default role assignment; is not itself an authorization check. |
| `roles` | organization_id (nullable = system-wide role), name, description | e.g. "Sales Executive," "Ops Manager," "B2B Agent." |
| `permissions` | code (unique, e.g. `sales.quotation:approve`), description | Seeded, code-owned (migrated via Alembic data migration, not user-editable in Phase 1). |
| `role_permissions` | role_id, permission_id | M:N join. |
| `user_roles` | user_id, role_id | M:N join — a user may hold more than one role (e.g. Ops + Finance in a small branch). |
| `external_principals` | user_id, principal_type (`B2B_AGENT`\|`B2C_CUSTOMER`\|`SUPPLIER`), linked_account_id | Phase 6+: links an auth principal to the `accounts` row it represents (an agent's own agency, a supplier). Keeps external identity distinct from internal `users` while sharing the same RBAC engine. |
| `refresh_tokens` | user_id, token_hash, expires_at, revoked_at, user_agent, ip | Supports the JWT refresh flow in `API_DESIGN.md`. |
| `audit_logs` | organization_id, actor_user_id (nullable — system actions), action, entity_type, entity_id, before (jsonb), after (jsonb), ip, created_at | Append-only. Indexed on `(entity_type, entity_id)` and `(actor_user_id, created_at)`. |

## 4. Domain: CRM

| Table | Key columns | Notes |
|---|---|---|
| `accounts` | organization_id, name, account_type (`INDIVIDUAL`\|`CORPORATE`\|`B2B_AGENT`), email, phone, billing_address, tax_id | Replaces the "company" half of today's `Client`. A B2B agent is an `account` with `account_type = B2B_AGENT`. |
| `contacts` | organization_id, account_id (nullable), first_name, last_name, email, phone, is_primary | An individual traveler or a named contact at a corporate/agent account. Replaces the "person" half of today's `Client`. |
| `pipelines` | organization_id, name, is_default | Configurable pipeline (e.g. "Retail Sales," "Corporate Sales"), replacing the single hardcoded enum. |
| `pipeline_stages` | pipeline_id, name, sort_order, is_won, is_lost | Ordered stages per pipeline; `is_won`/`is_lost` flag terminal stages for reporting. |
| `leads` | organization_id, account_id (nullable), contact_id, owner_user_id, pipeline_stage_id, source, notes | The sales-pipeline record; today's `Client.stage` becomes `leads.pipeline_stage_id`. |
| `interactions` | organization_id, lead_id (nullable), account_id (nullable), contact_id (nullable), user_id, type_id (FK to a small `interaction_types` lookup), subject, content, occurred_at | Generalized from today's `Interaction`; can attach to a lead, account, or contact directly. |
| `interaction_types` | code, label | Lookup table (Call/Email/Meeting/WhatsApp/Note today; open to more later). |
| `tags` / `taggables` | tag: name; taggable: tag_id, entity_type, entity_id | Optional free-form tagging across leads/accounts/bookings for filtering. |

## 5. Domain: Sales (Quotations, Itineraries, Bookings)

| Table | Key columns | Notes |
|---|---|---|
| `quotations` | organization_id, lead_id, account_id, contact_id, owner_user_id, status_id, valid_until, currency | Supersedes today's `Trip` as the *offer* stage. Versioned (see `quotation_versions`) so a quote can be revised without losing history. |
| `quotation_statuses` | code, label, sort_order | Lookup (Draft, Sent, Under Negotiation, Accepted, Rejected, Expired). |
| `quotation_versions` | quotation_id, version_number, destination_id, start_date, end_date, travelers_count, total_amount, currency, created_by_user_id | Each edit that meaningfully changes the offer creates a version; the itinerary belongs to a version. |
| `itineraries` | quotation_version_id, generated_by_ai (bool), ai_prompt, summary, total_estimated_cost, currency | 1:1 with a quotation version — same shape as today's `Itinerary`, re-parented. |
| `itinerary_days` | itinerary_id, day_number, date, title, location_destination_id | Same shape as today, `location` becomes an FK to `destinations` once Phase 2 lands (nullable free-text until then). |
| `itinerary_activities` | itinerary_day_id, order, start_time, title, description, location, category_id, estimated_cost, currency, duration_minutes, supplier_id (nullable) | Same shape as today; `category` becomes a lookup (`activity_categories`) instead of a native enum; gains an optional `supplier_id` once Phase 2 catalog exists. |
| `bookings` | organization_id, quotation_version_id, account_id, contact_id, owner_user_id, status_id, confirmation_number, total_amount, currency | Created on quotation acceptance — the *operational* record, independent lifecycle from the quotation. |
| `booking_statuses` | code, label, sort_order | Lookup (Confirmed, In Progress, Completed, Cancelled). |
| `booking_travelers` | booking_id, first_name, last_name, date_of_birth, passport_number, nationality | Pax-level detail needed for vouchers/documents, absent from today's model entirely. |
| `booking_documents` | booking_id, type (`VOUCHER`\|`INVOICE`\|`ITINERARY_PDF`), file_url, generated_at | Generated artifacts. |

## 6. Domain: Catalog (Phase 2)

| Table | Key columns | Notes |
|---|---|---|
| `destinations` | organization_id, name, country, timezone | Master data referenced by itineraries/branches/bookings. |
| `suppliers` | organization_id, name, type (`HOTEL`\|`ACTIVITY`\|`TRANSPORT`\|`GROUND_OPERATOR`), contact_email, contact_phone, payment_terms | Single supplier table, typed; specific inventories reference it. |
| `hotels` | supplier_id, destination_id, name, star_rating, address | |
| `hotel_room_types` | hotel_id, name, occupancy | |
| `hotel_rate_plans` | hotel_room_type_id, name, board_basis, valid_from, valid_to | |
| `hotel_inventory` | hotel_rate_plan_id, date, allotment, rate_amount, currency | Date-grained availability/rate; the highest-volume table in the schema — indexed on `(hotel_rate_plan_id, date)`. |
| `activities_catalog` | supplier_id, destination_id, name, description, default_duration_minutes | Distinct from `itinerary_activities` (which is an *instance* on a quote); this is the sellable product. |
| `activity_inventory` | activities_catalog_id, date, capacity, rate_amount, currency | |
| `transport_options` | supplier_id, destination_id, type (`TRANSFER`\|`RENTAL`\|`INTERCITY`), name | |
| `transport_inventory` | transport_options_id, date, capacity, rate_amount, currency | |

*(Exact shape of the hotel/activity/transport inventory tables is explicitly flagged as an open question in `PRODUCT_REQUIREMENTS.md` §6 — first-party CRS vs. third-party integration changes this significantly. The tables above are the first-party baseline.)*

## 7. Domain: Finance (Phase 3)

| Table | Key columns | Notes |
|---|---|---|
| `invoices` | organization_id, booking_id, account_id, invoice_number, status (`DRAFT`\|`ISSUED`\|`PAID`\|`OVERDUE`\|`VOID`), total_amount, currency, due_date | Client-facing receivable. |
| `invoice_line_items` | invoice_id, description, quantity, unit_amount, currency | |
| `payments` | organization_id, invoice_id (nullable), booking_id, direction (`INBOUND`\|`OUTBOUND`), method, amount, currency, status, processed_at, gateway_reference | Inbound = client payment, outbound = supplier payment. Never stores raw card data — `gateway_reference` points to the payment gateway's own token/charge id. |
| `supplier_bills` | organization_id, supplier_id, booking_id (nullable), bill_number, status, total_amount, currency, due_date | Payable side. |
| `currencies` | code (ISO 4217, PK), name, symbol | Lookup. |
| `fx_rates` | base_currency, quote_currency, rate, as_of_date | For multi-currency reporting roll-ups. |

## 8. Domain: Communications (Phase 5)

| Table | Key columns | Notes |
|---|---|---|
| `email_templates` / `whatsapp_templates` | organization_id, code, subject (email only), body, variables (jsonb) | Templated, not hardcoded strings in code. |
| `email_log` | organization_id, to_address, template_code, related_entity_type, related_entity_id, status, provider_message_id, sent_at | |
| `whatsapp_log` | organization_id, to_number, template_code, related_entity_type, related_entity_id, status, provider_message_id, sent_at | |
| `notifications` | user_id, type, payload (jsonb), read_at | In-app notification center. |

## 9. Entity relationship overview (Phase 1–3 scope)

```
organizations 1─N branches
organizations 1─N users ─N:M─ roles ─N:M─ permissions
organizations 1─N accounts 1─N contacts
accounts 1─N leads ──(pipeline_stage_id)── pipeline_stages ──N:1── pipelines
leads 1─N interactions
leads 1─N quotations 1─N quotation_versions 1─1 itineraries 1─N itinerary_days 1─N itinerary_activities
quotation_versions 1─1(optional) bookings 1─N booking_travelers
bookings 1─N invoices 1─N invoice_line_items
invoices 1─N payments
suppliers 1─N hotels / activities_catalog / transport_options → *_inventory (date-grained)
audit_logs → (entity_type, entity_id) polymorphic reference to any of the above
```

## 10. Indexing strategy (non-exhaustive, applied as each module ships)

- Every foreign key gets a btree index (SQLAlchemy/Alembic default is not automatic — declared explicitly).
- `(organization_id, <status/stage>_id)` composite indexes on `leads`, `quotations`, `bookings` — these are the primary list-view filters.
- `(entity_type, entity_id)` on `audit_logs` and `taggables` (polymorphic lookups).
- Date-range composite indexes on the `*_inventory` tables (`(catalog_id, date)`).
- Unique constraints: `users.email`, `currencies.code`, `(quotation_id, version_number)`, `(pipeline_id, sort_order)`.

## 11. Migration approach

- **Alembic** manages all schema changes in `apps/api/app/migrations`. No `db push`/sync-from-model workflow in any environment beyond a developer's own local sandbox — staging and production always migrate via reviewed, versioned Alembic revisions.
- Lookup tables (`permissions`, `interaction_types`, `activity_categories`, statuses) are seeded via Alembic **data migrations**, not left to a separate seed script, so their content is versioned alongside the schema that depends on it.
- The existing `prisma/schema.prisma` and its migration history are retired once the corresponding `apps/api` module reaches parity (per module, per `IMPLEMENTATION_ROADMAP.md`) — not deleted upfront.
