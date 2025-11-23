#!/bin/bash
# ========================================
# SCRIPT DE ATUALIZAÇÃO
# ========================================

set -e

echo "🔄 Atualizando aplicação..."

cd /home/ubuntu/smartshow

# Fazer backup antes de atualizar
./scripts/backup.sh

# Atualizar código
git pull origin main

# Reconstruir containers
cd web-site
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "✅ Atualização concluída!"
echo ""
echo "Verificando status..."
docker-compose ps


