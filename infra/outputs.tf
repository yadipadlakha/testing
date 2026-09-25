output "github_actions_role_arn" {
  description = "Put this in the GitHub repo secret AWS_DEPLOY_ROLE_ARN — the deploy workflow assumes it via OIDC."
  value       = aws_iam_role.github_actions_deploy.arn
}

output "amplify_app_id" {
  description = "Amplify App ID — used by the GitHub Actions workflow (AWS_AMPLIFY_APP_ID secret) and by the AWS CLI."
  value       = aws_amplify_app.app.id
}

output "amplify_default_domain" {
  description = "The auto-generated amplifyapp.com URL for this branch, live as soon as the first build finishes."
  value       = "https://${var.deploy_branch}.${aws_amplify_app.app.default_domain}"
}

output "custom_domain_status" {
  description = "Check this with: aws amplify get-domain-association --app-id <amplify_app_id> --domain-name <domain_name>"
  value       = "Domain association requested for ${var.domain_name} and www.${var.domain_name}. Verification can take up to 30-60 minutes."
}

output "rds_endpoint" {
  description = "RDS Postgres endpoint (host:port)."
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS Postgres host only."
  value       = aws_db_instance.main.address
}

output "database_url" {
  description = "Full DATABASE_URL for the production database (matches what's set on the Amplify app)."
  value       = local.database_url
  sensitive   = true
}
