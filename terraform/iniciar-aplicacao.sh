#!/bin/bash
# ========================================
# SCRIPT PARA INICIAR APLICAÇÃO MANUALMENTE
# ========================================
# Execute este script na EC2 se a aplicação não iniciou automaticamente
# Uso: bash iniciar-aplicacao.sh

set -e

echo "=========================================="
echo "🚀 Iniciando aplicação manualmente..."
echo "Data: $(date)"
echo "=========================================="

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "📁 Procurando docker-compose.yml..."
    
    # Tentar encontrar o diretório correto
    if [ -f "/opt/smartshow/smartshow/web-site/docker-compose.yml" ]; then
        echo "✅ Encontrado em /opt/smartshow/smartshow/web-site"
        cd /opt/smartshow/smartshow/web-site
    elif [ -f "web-site/docker-compose.yml" ]; then
        echo "✅ Encontrado em web-site/"
        cd web-site
    else
        echo "❌ Erro: docker-compose.yml não encontrado!"
        echo "📋 Procurando em todos os lugares..."
        find /opt -name "docker-compose.yml" 2>/dev/null || echo "Nenhum arquivo encontrado"
        exit 1
    fi
fi

echo "📂 Diretório atual: $(pwd)"
echo "📋 Verificando arquivos..."
ls -la docker-compose.yml || {
    echo "❌ docker-compose.yml não encontrado no diretório atual!"
    exit 1
}

# Verificar se Docker está rodando
echo "🐳 Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando!"
    echo "🔧 Tentando iniciar Docker..."
    sudo systemctl start docker
    sleep 5
fi

# Verificar se usuário está no grupo docker
if ! groups | grep -q docker; then
    echo "⚠️ Usuário não está no grupo docker"
    echo "🔧 Adicionando usuário ao grupo docker..."
    sudo usermod -aG docker $USER
    echo "⚠️ Você precisa fazer logout e login novamente, ou usar 'newgrp docker'"
    echo "🔧 Tentando continuar mesmo assim..."
fi

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p api/data api/output api/uploads
chmod -R 777 api/data api/output api/uploads || chmod -R 755 api/data api/output api/uploads

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down || true

# Construir imagens
echo "🔨 Construindo imagens Docker..."
if ! docker-compose build; then
    echo "⚠️ Build normal falhou, tentando com --no-cache..."
    docker-compose build --no-cache || {
        echo "❌ Erro ao construir containers"
        exit 1
    }
fi

# Iniciar aplicação
echo "🚀 Iniciando aplicação..."
docker-compose up -d || {
    echo "❌ Erro ao iniciar containers"
    echo "📋 Logs:"
    docker-compose logs --tail=50
    exit 1
}

# Aguardar aplicação iniciar
echo "⏳ Aguardando aplicação iniciar..."
sleep 15

# Verificar status
echo "🔍 Verificando status dos containers..."
docker-compose ps

# Verificar se API está respondendo
echo "🔍 Verificando API..."
for i in {1..10}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ API está respondendo!"
        break
    fi
    echo "Tentativa $i/10 - Aguardando API..."
    sleep 3
done

# Obter IP público
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "N/A")

echo "=========================================="
echo "✅ Aplicação iniciada!"
echo "=========================================="
echo "📊 Status dos containers:"
docker-compose ps
echo ""
echo "🌐 Aplicação disponível em:"
echo "   - http://${PUBLIC_IP}"
echo "   - http://${PUBLIC_IP}:3000"
echo ""
echo "📋 Para ver logs:"
echo "   docker-compose logs -f"
echo "=========================================="
































