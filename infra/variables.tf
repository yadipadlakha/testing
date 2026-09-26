variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Short name used to prefix all resources (RDS instance, security group, etc.)."
  type        = string
  default     = "travel-everywhere"
}

variable "environment" {
  description = "Environment name, used in tags and resource names."
  type        = string
  default     = "production"
}

variable "db_name" {
  description = "Name of the production Postgres database."
  type        = string
  default     = "travel_everywhere"
}

variable "db_username" {
  description = "Master username for the RDS instance."
  type        = string
  default     = "travel_admin"
}

variable "db_password" {
  description = "Master password for the RDS instance. Generate a strong random value and pass it via TF_VAR_db_password — never commit it."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is Free Tier eligible and plenty for a low-traffic CRM to start."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  description = "Allocated storage for RDS, in GB."
  type        = number
  default     = 20
}

variable "db_publicly_accessible" {
  description = "Whether RDS gets a public endpoint. true is the simplest option (no VPC networking to wire up for Amplify), locked down to db_allowed_cidr_blocks and SSL-only connections. Set to false only if you've also configured Amplify's SSR compute VPC connector — see DEPLOYMENT.md."
  type        = bool
  default     = true
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach RDS on 5432 when db_publicly_accessible is true. Defaults to open (0.0.0.0/0) because Amplify Hosting's build/compute egress IPs aren't static or published — access is protected by password + enforced SSL instead. Narrow this if you can (e.g. your office IP, a bastion) — see DEPLOYMENT.md for the tradeoffs."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
