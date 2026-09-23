-- Runs once, on first container init, via docker-entrypoint-initdb.d.
-- travel_dmc: apps/api (the target architecture).
-- travel_crm: apps/web's own Prisma-managed database (legacy MVP, until its
--             modules are migrated onto apps/api — see docs/IMPLEMENTATION_ROADMAP.md).
SELECT 'CREATE DATABASE travel_crm OWNER travel'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'travel_crm')\gexec

CREATE EXTENSION IF NOT EXISTS pgcrypto;
\connect travel_crm
CREATE EXTENSION IF NOT EXISTS pgcrypto;
