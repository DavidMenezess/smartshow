# ========================================
# CONFIGURAÇÃO DO PROVIDER AWS
# ========================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Provider AWS
provider "aws" {
  region = var.aws_region
  # Usar perfil apenas se fornecido e não estiver em CI/CD
  # No CI/CD, usar variáveis de ambiente (AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY)
  profile = var.aws_profile != "" && var.aws_profile != null ? var.aws_profile : null

  default_tags {
    tags = var.tags
  }
}

# Data source para obter a AMI mais recente do Ubuntu
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical (Ubuntu)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

# Data source para obter a VPC padrão
data "aws_vpc" "default" {
  default = true
}


