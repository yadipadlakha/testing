# Voyager — AI Itinerary Builder & Travel CRM (`apps/web`)

> This is the frontend service of the monorepo (see the root `README.md`). It currently
> still owns its own data access (Prisma) and auth (NextAuth) as the legacy MVP being
> migrated onto `apps/api` module by module — see `/docs/IMPLEMENTATION_ROADMAP.md`.
> Everything below describes how to run this app on its own, which still works unchanged.

A full-stack app for travel agencies: an AI-powered itinerary builder backed by the
Claude API, and a lightweight CRM for tracking leads, clients, and bookings.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Postgres** via **Prisma ORM**
- **Auth.js (NextAuth v5)** — credentials auth, JWT sessions, multi-tenant (per-agency) accounts
- **Anthropic Claude API** — structured, tool-use-driven itinerary generation
- **Tailwind CSS** + small in-repo UI kit, **Recharts** for dashboard charts

## Features

- **Multi-tenant accounts** — each signup creates an Agency; users are Admins or Agents scoped to it.
- **CRM** — clients/leads with a pipeline (New → Contacted → Proposal → Negotiation → Booked → Traveled/Lost),
  a logged interaction timeline (calls, emails, meetings, notes), and per-client trip history.
- **Trips** — bookings linked to a client, with status tracking (Inquiry → Planning → Quoted → Confirmed →
  In progress → Completed/Cancelled), budget, traveler count, and dates.
- **AI Itinerary Builder** — generates a realistic day-by-day itinerary (timed activities, categories,
  locations, cost estimates) from the trip brief plus free-text preferences, via a Claude tool-use call;
  results are persisted and can be regenerated.
- **Dashboard** — client/pipeline/revenue stats and upcoming trips.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Postgres** (or point `DATABASE_URL` at your own instance)

   ```bash
   docker compose up -d
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in:
   - `DATABASE_URL` — defaults to the docker-compose Postgres above.
   - `AUTH_SECRET` — generate with `npx auth secret`.
   - `ANTHROPIC_API_KEY` — required for AI itinerary generation ([console.anthropic.com](https://console.anthropic.com/)).

4. **Set up the database**

   ```bash
   npm run db:push   # create tables from prisma/schema.prisma
   npm run db:seed   # optional: demo agency, users, clients, and a trip
   ```

   Seeded logins (if you ran `db:seed`): `admin@voyager.dev` / `agent@voyager.dev`, password `password123`.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
prisma/schema.prisma          Data model (Agency, User, Client, Interaction, Trip, Itinerary, ...)
prisma/seed.ts                 Demo data
src/auth.ts                    Auth.js config (credentials provider, JWT session)
src/lib/ai/itinerary.ts        Claude tool-use call that generates structured itineraries
src/lib/actions/               Server actions (CRUD for clients, trips, itineraries)
src/app/(auth)/                Login / register
src/app/(app)/                 Authenticated app shell: dashboard, clients, trips
src/components/                Shared UI kit + feature components
```

## Useful scripts

| Script              | Purpose                              |
| ------------------- | ------------------------------------- |
| `npm run dev`        | Start the dev server                  |
| `npm run build`      | Production build                      |
| `npm run db:push`    | Sync Prisma schema to the database    |
| `npm run db:migrate` | Create/apply a migration              |
| `npm run db:seed`    | Load demo data                        |
| `npm run db:studio`  | Open Prisma Studio (DB browser)       |
