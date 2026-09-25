terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Uncomment and configure once you have an S3 bucket + DynamoDB table for
  # remote state (recommended before a second person ever runs this). See
  # DEPLOYMENT.md for the one-time bootstrap commands.
  #
  # backend "s3" {
  #   bucket         = "travel-everywhere-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "travel-everywhere-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}
