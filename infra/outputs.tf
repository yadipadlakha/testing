output "rds_endpoint" {
  description = "RDS Postgres endpoint (host:port)."
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS Postgres host only."
  value       = aws_db_instance.main.address
}

output "database_url" {
  description = "Full DATABASE_URL for the production database. Paste this into the DATABASE_URL environment variable on the Amplify app (Console → your app → Hosting → Environment variables)."
  value       = local.database_url
  sensitive   = true
}
