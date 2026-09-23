# API Design

Status: **Proposal.** Defines the REST conventions for `apps/api` (FastAPI). No endpoint listed here exists yet.

---

## 1. Principles

- **REST, resource-oriented, versioned in the URL**: `/api/v1/<resource>`. A breaking change ships as `/api/v2/...` alongside `v1` until consumers migrate — required because B2B/B2C/partner integrations will eventually depend on stability.
- **One backend, many frontends.** `apps/web` is a client of this API like any future B2B/B2C/partner client — it gets no special unversioned/private endpoints.
- **Every endpoint validates input and output** via Pydantic models (`schemas/`); a handler never accepts or returns a raw dict.
- **Every endpoint declares its required permission** via a FastAPI dependency; there is no endpoint that only "happens" to be safe because the UI doesn't expose a button for it.
- **Consistent envelope** on every response, success or failure (see §3) — no endpoint returns a bare array or a bare object at the top level.

## 2. URL structure

```
/api/v1/auth/login
/api/v1/auth/refresh
/api/v1/auth/logout
/api/v1/me                          # current user + effective permissions

/api/v1/accounts
/api/v1/accounts/{id}
/api/v1/accounts/{id}/contacts

/api/v1/leads
/api/v1/leads/{id}
/api/v1/leads/{id}/interactions
/api/v1/pipelines
/api/v1/pipelines/{id}/stages

/api/v1/quotations
/api/v1/quotations/{id}
/api/v1/quotations/{id}/versions
/api/v1/quotations/{id}/versions/{version}/itinerary
/api/v1/quotations/{id}/versions/{version}/itinerary/days
/api/v1/quotations/{id}/versions/{version}/itinerary/days/{day_id}/activities
/api/v1/quotations/{id}/accept                     # → creates a booking

/api/v1/bookings
/api/v1/bookings/{id}
/api/v1/bookings/{id}/travelers
/api/v1/bookings/{id}/documents

/api/v1/ai/itinerary/generate               # wraps Claude; async job pattern, see §6
/api/v1/ai/quotation/generate               # Phase 7

/api/v1/suppliers, /hotels, /activities-catalog, /transport-options   # Phase 2
/api/v1/invoices, /payments, /supplier-bills                          # Phase 3
/api/v1/reports/*                                                     # Phase 4
/api/v1/email-templates, /whatsapp-templates, /notifications          # Phase 5

/api/v1/admin/users
/api/v1/admin/roles
/api/v1/admin/audit-logs
```

Nested resources (`/leads/{id}/interactions`) are used only where the child is meaningless without its parent's context in the request; independently addressable resources (an interaction can also be fetched by its own id) still get a top-level route where a UI needs it directly.

## 3. Response envelope

**Success:**

```json
{
  "data": { /* resource or array */ },
  "meta": {
    "request_id": "b3f1...",
    "pagination": { "page": 1, "page_size": 25, "total": 214 }
  }
}
```

`meta.pagination` is present only on list endpoints.

**Error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "email", "message": "Not a valid email address." }
    ],
    "request_id": "b3f1..."
  }
}
```

`request_id` on both shapes ties a client-visible error to a server log line for support/debugging (see `ARCHITECTURE.md` §2.5 on logging).

### 3.1 Standard error codes → HTTP status

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Pydantic/schema validation failed |
| `UNAUTHENTICATED` | 401 | Missing/invalid/expired access token |
| `FORBIDDEN` | 403 | Authenticated but lacks the required permission |
| `NOT_FOUND` | 404 | Resource doesn't exist or isn't in the caller's org scope |
| `CONFLICT` | 409 | e.g. optimistic-concurrency version mismatch, duplicate unique field |
| `RATE_LIMITED` | 429 | Throttled (public/partner-facing endpoints, Phase 6+) |
| `INTERNAL_ERROR` | 500 | Unexpected — logged with full stack server-side, generic message returned to the client |

A global FastAPI exception handler maps all raised domain exceptions to this table so individual routers never hand-roll error JSON.

## 4. Pagination, filtering, sorting

- List endpoints accept `page` (1-based) and `page_size` (default 25, max 100), or `cursor` for high-volume tables (`hotel_inventory`) where offset pagination degrades.
- Filtering via explicit query params per resource (e.g. `GET /leads?stage_id=...&owner_id=...&created_after=...`) — no generic/opaque query language in Phase 1.
- Sorting via `sort=field` / `sort=-field` (leading `-` = descending), restricted to an allow-list of indexed columns per endpoint.

## 5. Authentication & authorization

### 5.1 Token flow

1. `POST /api/v1/auth/login` (email + password) → returns a short-lived **access token** (JWT, ~15 min, in the JSON body) and sets an `httpOnly`, `Secure`, `SameSite=Lax` **refresh token** cookie (long-lived, rotated on use).
2. `apps/web` sends `Authorization: Bearer <access_token>` on every API call it makes (server-side, from Server Components/Route Handlers — the browser never talks to `apps/api` directly in Phase 1).
3. On a 401 from an expired access token, `apps/web` calls `POST /api/v1/auth/refresh` (forwarding the refresh cookie) to get a new access token, transparently to the end user.
4. `POST /api/v1/auth/logout` revokes the refresh token server-side (`refresh_tokens.revoked_at`).

### 5.2 JWT claims

```json
{
  "sub": "<user_id>",
  "org": "<organization_id>",
  "principal_type": "INTERNAL",
  "roles": ["sales_executive"],
  "aud": "internal-app",
  "exp": 1234567890
}
```

`principal_type` + `aud` keep future B2B/B2C/supplier tokens (issued from the same auth service, different `aud`) cryptographically distinct from internal tokens — an internal-audience token is rejected by any endpoint scoped to `aud: "b2b-portal"` and vice versa.

### 5.3 Authorization

Every endpoint declares a required permission via a dependency:

```
@router.post("/quotations/{id}/accept")
def accept_quotation(..., _: None = Depends(require_permission("sales.quotation:accept"))):
    ...
```

Permission codes are `<module>.<resource>:<action>` (e.g. `sales.quotation:approve`, `finance.invoice:void`, `admin.user:manage`). The permission set for a request is resolved once per request (user → roles → permissions) and attached to the request context, so a single DB round trip covers every `require_permission` check in that handler chain.

`GET /api/v1/me` returns the caller's profile **and** their resolved permission list, so `apps/web` can render/hide UI affordances without guessing — but the API enforces the check regardless of what the UI shows.

## 6. Long-running / AI endpoints

AI generation (`/ai/itinerary/generate`) is a synchronous call in Phase 1 (matches today's UX — a form submit that waits for the result) but the contract is written so it can move to an async job pattern without a breaking change:

```
POST /api/v1/ai/itinerary/generate
→ 200 { "data": { "itinerary": {...} } }                 # Phase 1: synchronous
→ 202 { "data": { "job_id": "...", "status": "PENDING" } } # future: async, poll /ai/jobs/{job_id}
```

Every AI generation call is recorded (prompt, model, token usage, resulting entity id, requesting user) for cost tracking and audit — this is a `sales`/`ai` module responsibility, not left as a bare provider call the way it is in today's MVP.

## 7. Idempotency (Finance & Bookings, Phase 3+)

State-changing endpoints that must not double-execute on client retry (payment capture, quotation acceptance) accept an `Idempotency-Key` header; the API stores the key with the resulting response for a bounded window and replays that response on a duplicate key instead of re-executing the action.

## 8. OpenAPI & typed client generation

FastAPI generates the OpenAPI schema automatically from the Pydantic models and route declarations. `apps/web`'s API client (`src/lib/api/`) is generated from that schema (e.g. via `openapi-typescript`) as part of the build/dev workflow, so the frontend's request/response types can never drift from the backend's actual contract — this replaces today's implicit contract (Server Actions sharing Prisma types in-process, which only works because frontend and "backend" are the same process).

## 9. What this replaces

Today's Server Actions (`src/lib/actions/*.ts`) are direct Prisma calls invoked from form submissions — there is no independently callable contract. Each Server Action in the current codebase maps to one or more endpoints above; `IMPLEMENTATION_ROADMAP.md` tracks that mapping module by module as the strangler-fig migration proceeds.
