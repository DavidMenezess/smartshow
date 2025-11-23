# ========================================
# VARIÁVEIS DO TERRAFORM - AWS FREE TIER
# ========================================

variable "aws_region" {
  description = "Região da AWS para deploy (sa-east-1 para Brasil, us-east-1 para Free Tier)"
  type        = string
  default     = "sa-east-1" # Região de São Paulo (melhor latência para Brasil)
}

variable "project_name" {
  description = "Nome do projeto"
  type        = string
  default     = "smartshow"
}

variable "environment" {
  description = "Ambiente de deploy"
  type        = string
  default     = "prod"
}

variable "instance_type" {
  description = "Tipo da instância EC2 (t3.small ou t2.micro para Free Tier)"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Nome da chave SSH para acesso à instância EC2 (sem extensão .pem)"
  type        = string
  default     = "smartshow"
}

variable "your_ip" {
  description = "Seu IP público para acesso SSH (formato: x.x.x.x/32). Descubra seu IP: curl ifconfig.me"
  type        = string
  default     = "0.0.0.0/32"  # ⚠️ ALTERE no terraform.tfvars com seu IP real
}

variable "ebs_volume_size" {
  description = "Tamanho do volume EBS em GB (Free Tier: até 30GB)"
  type        = number
  default     = 20

  validation {
    condition     = var.ebs_volume_size >= 8 && var.ebs_volume_size <= 30
    error_message = "Tamanho do volume deve estar entre 8GB e 30GB para Free Tier."
  }
}

variable "api_port" {
  description = "Porta da API Node.js"
  type        = number
  default     = 3000
}

variable "aws_profile" {
  description = "Perfil AWS CLI a ser usado (deixe vazio para usar default ou variável de ambiente). No CI/CD, deixe vazio para usar variáveis de ambiente."
  type        = string
  default     = "" # Vazio por padrão para funcionar no CI/CD
}

variable "github_token" {
  description = "Token do GitHub para clonar repositório privado (deixe vazio se o repositório for público)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_repo" {
  description = "URL do repositório GitHub (com ou sem token)"
  type        = string
  default     = "https://github.com/DavidMenezess/smartshow.git"
}

variable "tags" {
  description = "Tags padrão para recursos AWS"
  type        = map(string)
  default = {
    Project     = "Smartshow"
    ManagedBy   = "Terraform"
    Environment = "Production"
    CostCenter  = "Free-Tier"
  }
}


