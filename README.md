# TravelEverywhere

B2C login and account portal for TravelEverywhere, built with Next.js, Prisma, and NextAuth.

## Prerequisites

- Node.js 20+
- A PostgreSQL database (via `docker-compose.yml`, or your own instance)

## Getting started

1. Install dependencies (this also runs `prisma generate` automatically via `postinstall`):

   ```bash
   npm install
   ```

2. Copy the environment file and fill in real values:

   ```bash
   cp .env.example .env
   ```

3. Start Postgres (skip if you already have a database running):

   ```bash
   docker compose up -d
   ```

4. Push the schema and seed a demo admin user:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with the seeded demo admin (`admin@traveleverywhere.com` / `password123`).

## Troubleshooting

- **`'next' is not recognized...`** — `npm install` hasn't been run (or didn't finish) in this folder, so `node_modules` doesn't exist yet.
- **`@prisma/client did not initialize yet...`** — run `npx prisma generate`. This now runs automatically after `npm install`, but if `node_modules` was restored from a cache or copied between machines, regenerate it manually.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build and start
- `npm run db:push` — sync the Prisma schema to the database
- `npm run db:migrate` — create a dev migration
- `npm run db:seed` — seed the demo admin user
- `npm run db:studio` — open Prisma Studio
