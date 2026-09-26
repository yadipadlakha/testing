locals {
  database_url = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}?sslmode=require"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "db" {
  name        = "${var.app_name}-${var.environment}-db"
  description = "Allow Postgres access to the ${var.app_name} ${var.environment} RDS instance"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Postgres"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.db_allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-db"
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "default" {
  name       = "${var.app_name}-${var.environment}-db-subnets"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name        = "${var.app_name}-${var.environment}-db-subnets"
    Environment = var.environment
  }
}

# Forces every client connection to use SSL — the main mitigation for
# running RDS with a public endpoint (see db_publicly_accessible / DEPLOYMENT.md).
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.app_name}-${var.environment}-pg16"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-pg16"
    Environment = var.environment
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.app_name}-${var.environment}"
  engine     = "postgres"
  # Verify this is still a valid, available version before applying:
  #   aws rds describe-db-engine-versions --engine postgres --query 'DBEngineVersions[].EngineVersion'
  engine_version = "16.4"

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage_gb
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name
  publicly_accessible    = var.db_publicly_accessible

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:30-mon:05:30"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.app_name}-${var.environment}-final"
  deletion_protection       = true

  tags = {
    Name        = "${var.app_name}-${var.environment}"
    Environment = var.environment
  }
}
