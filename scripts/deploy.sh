#!/bin/bash
# ========================================
# SCRIPT DE DEPLOY
# ========================================

set -e

echo "🚀 Iniciando deploy da Loja de Eletrônicos..."

# Verificar se está no diretório correto
if [ ! -f "terraform/terraform.tfvars" ]; then
    echo "❌ Erro: Execute este script da raiz do projeto"
    exit 1
fi

# Ir para diretório do Terraform
cd terraform

# Inicializar Terraform
echo "📦 Inicializando Terraform..."
terraform init

# Validar configuração
echo "✅ Validando configuração..."
terraform validate

# Planejar deploy
echo "📋 Planejando deploy..."
terraform plan

# Confirmar deploy
read -p "Deseja continuar com o deploy? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Deploy cancelado."
    exit 1
fi

# Aplicar
echo "🚀 Aplicando configuração..."
terraform apply -auto-approve

# Mostrar outputs
echo ""
echo "✅ Deploy concluído!"
echo ""
terraform output

cd ..










