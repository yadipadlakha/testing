# Deploying TravelEverywhere to AWS

This sets the app up on **AWS Amplify Hosting** (SSR compute, built for Next.js
App Router) with an **RDS Postgres** production database. The repo lives on
**Bitbucket** (`moonsky1111/aitravelbuilder`), so the pipeline here is split
differently than a typical GitHub setup:

- **RDS Postgres** is provisioned with Terraform (`infra/`) — pure AWS, no
  cross-provider auth involved.
- **The Amplify app itself is created through the AWS Console**, not
  Terraform. Amplify's Bitbucket Cloud connection is an interactive OAuth
  authorization (you sign in to Bitbucket and approve AWS Amplify's access)
  — there's no static-token equivalent to feed Terraform the way GitHub's
  classic PAT works, so the Console is the right tool for this one step.
  Once connected, Amplify's own git webhook auto-builds and deploys on
  every push to your branch — no external CI needs to trigger anything.
- **`bitbucket-pipelines.yml`** is a lint/build quality gate only (no AWS
  credentials, nothing to configure). The actual deploy trigger is Amplify's
  native Bitbucket webhook, set up in the Console step below.
- **`amplify.yml`** runs `npx prisma db push` as part of every Amplify
  build, so the production schema stays in sync automatically — no separate
  deploy pipeline needed for that either.

**I don't have access to your actual AWS or Bitbucket accounts from this
session** — the `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars visible
in this sandbox are proxy placeholders, not real credentials. Everything
below is for you (or whoever holds your AWS credentials) to run.

## What gets created

| Resource | How | Purpose |
|---|---|---|
| `aws_db_instance` (RDS Postgres 16) | Terraform | Production database, replacing the local Docker Postgres |
| Amplify app + branch | AWS Console (Bitbucket OAuth) | Hosts the Next.js app, builds via `amplify.yml`, auto-deploys on push |
| Custom domain | AWS Console (Amplify → Domain management) | Serves `yourdomain.com` and `www.yourdomain.com` |

## One-time setup

### 1. Prerequisites

- An AWS account with permission to create RDS, Amplify, and Route 53
  resources. (You've already done this — IAM user `terraform-deploy` with
  `AdministratorAccess`, `aws configure` verified against account
  `646170419950`.)
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.6
  (you have 1.16.2 — fine, no need to update for this).
- Admin access to the `moonsky1111/aitravelbuilder` Bitbucket repo, so you
  can authorize AWS Amplify's OAuth connection to it.
- Your domain, registered at **GoDaddy**, not yet in Route 53. Steps 2 and 5
  below handle moving DNS authority to Route 53 — you keep the domain
  registered at GoDaddy, only the nameservers change.

### 2. Create a Route 53 hosted zone for your domain

```bash
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference "$(date +%s)"
```

Note the `Id` in the output (looks like `/hostedzone/Z0123...` — you'll use
the part after the last `/`), and the four `NS` records under
`DelegationSet.NameServers`. You can also fetch these later with:

```bash
aws route53 list-hosted-zones-by-name --dns-name yourdomain.com
```

### 3. Point GoDaddy at Route 53

In GoDaddy: **My Products → DNS → Nameservers → Change** → choose "Enter my
own nameservers" → paste the four `ns-....amazonaws.com` values from step 2
(remove the trailing dot from each) → Save.

DNS propagation for a nameserver change typically takes anywhere from a few
minutes to a few hours (occasionally up to 24-48h). You don't have to wait
for it before continuing — steps 4-6 below don't depend on propagation
being finished, only the final "visit your domain" check does.

### 4. Provision RDS with Terraform

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Fill in `app_name`/`environment`/`db_name`/`db_username` if you want
anything other than the defaults, then:

```bash
export TF_VAR_db_password="$(openssl rand -base64 24)"
terraform init
terraform plan   # read this before applying anything against a real account
terraform apply
```

This takes a few minutes (mostly RDS provisioning). When it finishes:

```bash
terraform output rds_endpoint
terraform output -raw database_url   # save this — you'll paste it into Amplify in step 5
```

### 5. Connect Amplify to Bitbucket (AWS Console)

1. Open the [Amplify Console](https://console.aws.amazon.com/amplify/) →
   **Create new app** → **Host web app**.
2. Choose **Bitbucket** as the source, sign in, and authorize AWS Amplify's
   OAuth access to your Bitbucket workspace when prompted.
3. Pick the repository `moonsky1111/aitravelbuilder` and the branch
   `main`.
4. Build settings: Amplify should auto-detect `amplify.yml` at the repo
   root — confirm it's using that instead of generating its own.
5. **App settings → Compute**: set the hosting compute type to **SSR**
   (this repo needs `WEB_COMPUTE`, not static — required for the App
   Router's server actions/API routes).
6. **Advanced settings → Environment variables**, add:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the value from `terraform output -raw database_url` (step 4) |
   | `AUTH_SECRET` | generate with `npx auth secret --raw` or `openssl rand -base64 33` |
7. Save and deploy. First build typically takes 3-6 minutes — watch it in
   the Console's build log. It will run `npm ci`, `npx prisma db push`,
   then `npm run build`.

   **Why the env vars in step 6 alone aren't enough**: on this app's
   Amplify SSR (Web Compute) setup, Console-configured environment
   variables only populate the *build* shell — confirmed live by a runtime
   diagnostic that logged both `AUTH_SECRET` and `DATABASE_URL` as
   `undefined` inside the deployed Lambda at request time, even though
   `prisma db push` (which reads `DATABASE_URL` during the build) worked
   fine. `amplify.yml`'s build phase works around this by writing both
   values to a `.env.production.local` file right before `next build`,
   which Next.js's own env loader picks up at Lambda cold start — so they
   still need to be set in step 6 (the build shell is where
   `amplify.yml` reads them from), this workaround is just why the app
   actually receives them at runtime too.
8. Once it succeeds, note the app's default URL
   (`https://main.<app-id>.amplifyapp.com`) — the app is live there
   immediately, independent of the custom domain below.

From now on, every push to `main` on Bitbucket triggers a new Amplify build
and deploy automatically — no separate pipeline step required.

### 6. Add the custom domain (AWS Console)

1. In the Amplify Console, open your app → **Hosting → Custom domains** →
   **Add domain**.
2. Enter `yourdomain.com`. Since the Route 53 hosted zone from step 2 is in
   the same AWS account, Amplify detects it and can create the required
   DNS records (including the SSL certificate validation records)
   automatically — confirm when prompted.
3. Add both the apex (`yourdomain.com`) and `www` subdomain when asked.
4. Domain + SSL certificate verification can take 30-60 minutes once
   nameserver propagation (step 3) has completed. Check status any time:
   ```bash
   aws amplify get-domain-association \
     --app-id <your-app-id> \
     --domain-name yourdomain.com
   ```

### 7. Seed the production database (one time)

```bash
DATABASE_URL="$(cd infra && terraform output -raw database_url)" npx tsx prisma/seed.ts
```

This creates the demo admin (`admin@traveleverywhere.com` /
`password123`) — **change that password immediately** after first login, or
edit `prisma/seed.ts` to seed your real admin instead before running it.

## How ongoing deploys work

1. Push to `main` on Bitbucket.
2. `bitbucket-pipelines.yml` runs lint + `next build` as a quality signal
   (visible in Bitbucket's Pipelines tab) — it does not gate or trigger the
   deploy.
3. Independently, Amplify's own Bitbucket webhook fires, and Amplify runs
   `amplify.yml`: `npm ci` → `npx prisma db push` (schema sync, fails the
   build rather than silently dropping data) → `npm run build` → deploy.

## Things worth knowing before you rely on this in production

- **This project doesn't use Prisma's migration system** (`prisma migrate`)
  — it uses `db push`, syncing the schema directly from `schema.prisma` on
  every build. `db push` refuses (rather than silently applying) any change
  that would lose data — run `npx prisma db push --accept-data-loss` by
  hand against `DATABASE_URL` when you actually intend a destructive change
  (e.g. dropping a column). If the data model stabilizes, switching to real
  migrations (`prisma migrate dev` → commit migration files → `prisma
  migrate deploy` in `amplify.yml`) is a worthwhile upgrade.
- **`backup_retention_period` is set to 1 day**, not the usual 7+. Brand-new
  AWS accounts carry a temporary Free Tier restriction (`CreateDBInstance`
  fails with `FreeTierRestrictionError` above 1 day) until the account ages
  out of it — typically after some real usage/billing history. Bump it back
  up in `infra/database.tf` once that restriction clears.
- **RDS is publicly accessible by default** (`db_publicly_accessible =
  true`), locked to `db_allowed_cidr_blocks` (defaults to open,
  `0.0.0.0/0`) at the security-group level, with `rds.force_ssl` enabled so
  every connection must use TLS. This is the pragmatic choice because
  Amplify Hosting's compute/build egress IPs aren't static or published, so
  there's no clean CIDR to lock the security group to otherwise. It's
  protected by password + enforced SSL, not network isolation. If you want
  real network isolation instead, the alternative is: set
  `db_publicly_accessible = false`, put RDS in private subnets, and
  configure Amplify's SSR compute VPC connector (Amplify Hosting → your app
  → Hosting compute → "Connect to a VPC") to reach it — more setup,
  meaningfully more secure.
- **Cost**: roughly $15-30/month for `db.t4g.micro` RDS (Free Tier covers
  part of this in year one) + Amplify's pay-per-build-minute and
  pay-per-GB-served pricing, which is close to free at low traffic. No NAT
  gateway or load balancer in this setup, which is where costs usually
  balloon.
- **State**: this Terraform uses local state by default. Before anyone else
  touches this infrastructure, set up the S3 + DynamoDB remote backend
  (commented out in `infra/versions.tf`) so state isn't sitting on one
  laptop.
- **Rollback**: Amplify keeps every previous build. To roll back, either
  revert the commit on `main` and let the webhook redeploy, or use `aws
  amplify start-job --app-id <app-id> --branch-name main --job-type
  REDEPLOY --job-id <previous-job-id>` for the last-known-good build without
  touching the database.
- **Secrets note**: if you ever paste an AWS access key, Bitbucket token, or
  other credential into a chat/ticket/Slack thread, treat it as compromised
  and rotate it — regardless of where the conversation is stored.
