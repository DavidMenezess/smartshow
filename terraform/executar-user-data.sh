#!/bin/bash
# ========================================
# SCRIPT PARA EXECUTAR USER-DATA MANUALMENTE
# ========================================
# Use este script se o user-data não executou automaticamente
# Execute na EC2: sudo bash executar-user-data.sh

set -x

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Este script precisa ser executado como root (use sudo)"
    exit 1
fi

echo "🚀 Executando configuração automática..."
echo "Data: $(date)"

# Executar o mesmo script do user-data
# O script vai usar as variáveis do templatefile
# Mas vamos usar valores padrão se não estiverem definidas

GITHUB_REPO="${github_repo:-https://github.com/Katrashi/smartshow.git}"
GITHUB_TOKEN="${github_token:-}"

# Exportar variáveis para o script
export github_repo="$GITHUB_REPO"
export github_token="$GITHUB_TOKEN"

# Executar o user-data.sh
bash /opt/smartshow/user-data.sh 2>&1 | tee -a /var/log/user-data-manual.log

echo "✅ Script executado!"
echo "📋 Verifique os logs em /var/log/user-data-manual.log"





