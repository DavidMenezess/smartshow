#!/bin/bash
# Script para limpar completamente containers Docker antes do deploy

set -e

echo "🛑 Iniciando limpeza completa de containers..."

# Parar e remover via docker-compose
echo "📦 Parando containers via docker-compose..."
docker-compose down -v --remove-orphans 2>/dev/null || true
docker-compose rm -f 2>/dev/null || true

# Parar container específico
echo "🛑 Parando container smartshow-api..."
docker stop smartshow-api 2>/dev/null || true

# Remover container específico (múltiplas tentativas)
echo "🗑️ Removendo container smartshow-api..."
for i in {1..5}; do
    docker rm -f smartshow-api 2>/dev/null && break || sleep 1
done

# Remover qualquer container com o nome smartshow-api
echo "🔍 Buscando containers com nome smartshow-api..."
CONTAINERS=$(docker ps -aq --filter name=smartshow-api 2>/dev/null || echo "")
if [ -n "$CONTAINERS" ]; then
    echo "🗑️ Removendo containers encontrados: $CONTAINERS"
    echo "$CONTAINERS" | xargs -r docker rm -f 2>/dev/null || true
fi

# Remover redes
echo "🌐 Removendo redes..."
docker network rm web-site_loja-network 2>/dev/null || true
docker network rm loja-network 2>/dev/null || true

# Limpar redes órfãs
echo "🧹 Limpando redes órfãs..."
docker network prune -f 2>/dev/null || true

# Verificar se container ainda existe
echo "✅ Verificando remoção..."
if docker ps -a | grep -q smartshow-api; then
    echo "⚠️ AVISO: Container ainda existe após limpeza!"
    docker ps -a | grep smartshow-api
    # Tentar remover novamente com força máxima
    docker ps -a --filter name=smartshow-api --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
    sleep 2
else
    echo "✅ Container removido com sucesso!"
fi

# Aguardar um pouco para garantir que tudo foi limpo
sleep 3

echo "✅ Limpeza concluída!"

