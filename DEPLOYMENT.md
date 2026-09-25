# Deploying TravelEverywhere to AWS

This sets the app up on **AWS Amplify Hosting** (SSR compute, built for Next.js
App Router) with a **RDS Postgres** production database and a **GitHub
Actions** pipeline that lints, builds, syncs the database schema, and
triggers the Amplify deploy on every push to `main`.

**I don't have access to your actual AWS account from this session** — the
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars visible in this sandbox
are proxy placeholders, not real credentials. Everything below is Terraform
and workflow code for you (or whoever holds your AWS credentials) to run.
Treat the Terraform as a strong starting point to `plan`/review, not as
something to blindly `apply` — nobody has run this against a live AWS
account yet.

## What gets created

| Resource | Purpose |
|---|---|
| `aws_amplify_app` + branch + domain association | Hosts the Next.js app, builds via `amplify.yml`, serves `yourdomain.com` and `www.yourdomain.com` |
| `aws_db_instance` (RDS Postgres 17) | Production database, replacing the local Docker Postgres |
| `aws_iam_openid_connect_provider` + role | Lets GitHub Actions trigger Amplify deploys without long-lived AWS keys |

Everything lives in `infra/` (Terraform) plus `amplify.yml` and
`.github/workflows/{ci,deploy}.yml` at the repo root.

## One-time setup

### 1. Prerequisites

- An AWS account with permission to create Amplify, RDS, and IAM resources.
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.6.
- Your domain already registered with its hosted zone in **Route 53** (you
  said this is already the case). Find the zone ID with:
  ```bash
  aws route53 list-hosted-zones-by-name --dns-name yourdomain.com
  ```
- A GitHub [personal access token](https://github.com/settings/tokens)
  (classic, `repo` scope) so Amplify can read the repository and manage its
  build webhook — used at `apply` time, not stored by the app afterward.

### 2. Configure Terraform variables

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Fill in `domain_name`, `route53_zone_id`, `github_repository_url`,
`github_owner_repo`. Keep the sensitive values (`github_access_token`,
`db_password`, `auth_secret`) **out of the file** — export them instead:

```bash
export TF_VAR_github_access_token="ghp_..."
export TF_VAR_db_password="$(openssl rand -base64 24)"
export TF_VAR_auth_secret="$(openssl rand -base64 33)"
```

### 3. Apply

```bash
terraform init
terraform plan   # read this before applying anything against a real account
terraform apply
```

This takes a few minutes (mostly RDS provisioning). When it finishes, note
the outputs:

```bash
terraform output amplify_app_id
terraform output github_actions_role_arn
terraform output rds_endpoint
```

### 4. Verify the custom domain

```bash
aws amplify get-domain-association \
  --app-id "$(terraform output -raw amplify_app_id)" \
  --domain-name yourdomain.com
```

Domain verification can take 30–60 minutes. If Amplify reports it's waiting
on DNS records that weren't created automatically (this can happen
depending on provider version / hosted zone setup), the command above prints
the exact CNAME records to add — add them in Route 53 and it'll pick up
within a few minutes.

### 5. GitHub repo secrets

Add these under **Settings → Secrets and variables → Actions** on the
GitHub repo (`yadipadlakha/testing`):

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_actions_role_arn` |
| `AWS_AMPLIFY_APP_ID` | `terraform output -raw amplify_app_id` |
| `AWS_REGION` | Whatever you set `aws_region` to (default `us-east-1`) |
| `DATABASE_URL` | `terraform output -raw database_url` |

Then create a GitHub **Environment** named `production` (Settings →
Environments) — the deploy workflow targets it, which also gives you a place
to add required reviewers/approval gates later if you want them.

### 6. First deploy

```bash
git push origin main
```

Watch the **Deploy to production** workflow in the Actions tab. It lints,
builds, runs `prisma db push` against RDS, then calls
`aws amplify start-job` and polls until Amplify finishes. First deploy
typically takes 3–6 minutes.

### 7. Seed the production database (one time)

The schema will exist after the first `db push`, but there's no admin user
yet. Run the seed script once, pointed at production:

```bash
DATABASE_URL="$(cd infra && terraform output -raw database_url)" npx tsx prisma/seed.ts
```

This creates the demo admin (`admin@traveleverywhere.com` /
`password123`) — **change that password immediately** after first login, or
edit `prisma/seed.ts` to seed your real admin instead before running it.

## How ongoing deploys work

Every push to `main` runs `.github/workflows/deploy.yml`:

1. Lint + `next build` (fails fast if the code is broken).
2. `prisma db push` against the production database, so schema changes ship
   before the new code that needs them goes live.
3. Assume the `AWS_DEPLOY_ROLE_ARN` role via OIDC (no stored AWS keys).
4. `aws amplify start-job --job-type RELEASE`, then poll until it succeeds
   or fails.

Amplify's own git webhook is deliberately **off**
(`enable_auto_build = false` on the branch) so there's exactly one
deploy path, not two racing each other.

Pull requests and other branches only run `.github/workflows/ci.yml`
(lint + build) — nothing gets deployed from them.

## Things worth knowing before you rely on this in production

- **This project doesn't use Prisma's migration system** (`prisma migrate`)
  — it uses `db push`, syncing the schema directly from `schema.prisma`.
  That's fine for the pace of a small app, but `db push` can't handle every
  kind of schema change safely (e.g. it may need `--accept-data-loss` for
  some column type changes) and has no rollback history. If the data model
  stabilizes, switching to real migrations
  (`prisma migrate dev` → commit the migration files → `prisma migrate
  deploy` in the pipeline) is a worthwhile upgrade.
- **RDS is publicly accessible by default** (`db_publicly_accessible =
  true`), locked to your `db_allowed_cidr_blocks` (defaults to open,
  `0.0.0.0/0`) at the security-group level, with `rds.force_ssl` enabled so
  every connection must use TLS. This is the pragmatic choice because
  Amplify Hosting's compute/build egress IPs aren't static or published, so
  there's no clean CIDR to lock the security group to otherwise. It's
  protected by password + enforced SSL, not network isolation. If you want
  real network isolation instead, the alternative is: set
  `db_publicly_accessible = false`, put RDS in private subnets, and
  configure Amplify's SSR compute VPC connector (Amplify Hosting → your app
  → Hosting compute → "Connect to a VPC") to reach it — more setup, meaningfully
  more secure.
- **Cost**: roughly $15–30/month for `db.t4g.micro` RDS (Free Tier covers
  part of this in year one) + Amplify's pay-per-build-minute and
  pay-per-GB-served pricing, which is close to free at low traffic. No NAT
  gateway or load balancer in this setup, which is where costs usually
  balloon.
- **State**: this Terraform uses local state by default. Before anyone else
  touches this infrastructure, set up the S3 + DynamoDB remote backend
  (commented out in `infra/versions.tf`) so state isn't sitting on one
  laptop.
- **Rollback**: Amplify keeps every previous build. To roll back, either
  revert the commit on `main` and let the pipeline redeploy, or use `aws
  amplify start-job --job-type REDEPLOY --job-id <previous-job-id>` for the
  last-known-good build without touching the database.
