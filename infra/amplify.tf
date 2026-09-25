locals {
  database_url = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}?sslmode=require"
}

resource "aws_amplify_app" "app" {
  name         = "${var.app_name}-${var.environment}"
  repository   = var.github_repository_url
  access_token = var.github_access_token

  platform = "WEB_COMPUTE" # required for Next.js SSR (app router, server actions, API routes)

  build_spec = file("${path.module}/../amplify.yml")

  environment_variables = {
    DATABASE_URL = local.database_url
    AUTH_SECRET  = var.auth_secret
  }

  auto_branch_creation_config {
    enable_auto_build = false
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.app.id
  branch_name = var.deploy_branch

  framework = "Next.js - SSR"
  stage     = "PRODUCTION"

  # Auto-build on push is deliberately off: the GitHub Actions workflow is
  # the real trigger (it runs lint/build/db-push first, then calls
  # `aws amplify start-job` itself). This avoids Amplify racing its own
  # webhook build against the Actions-driven one.
  enable_auto_build = false
}

resource "aws_amplify_domain_association" "domain" {
  app_id      = aws_amplify_app.app.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "www"
  }
}
