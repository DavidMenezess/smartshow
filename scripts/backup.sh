#!/bin/bash
# ========================================
# SCRIPT DE BACKUP
# ========================================

set -e

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.tar.gz"

echo "💾 Iniciando backup..."

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Fazer backup do banco de dados
echo "📦 Fazendo backup do banco de dados..."
docker exec smartshow-api tar czf /tmp/backup_db.tar.gz -C /app data/

# Copiar backup do container
docker cp smartshow-api:/tmp/backup_db.tar.gz $BACKUP_DIR/db_${DATE}.tar.gz

# Fazer backup completo
cd /home/ubuntu/smartshow
tar czf $BACKUP_DIR/$BACKUP_FILE \
    web-site/api/data \
    web-site/api/output \
    --exclude='node_modules' \
    --exclude='*.log'

echo "✅ Backup criado: $BACKUP_DIR/$BACKUP_FILE"

# Manter apenas últimos 7 backups
echo "🧹 Limpando backups antigos..."
cd $BACKUP_DIR
ls -t | tail -n +8 | xargs -r rm

echo "✅ Backup concluído!"


