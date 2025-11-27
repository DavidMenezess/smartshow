#!/bin/bash
# Script para limpar completamente containers Docker antes do deploy

set -e

echo "🛑 Iniciando limpeza completa de containers..."

# Parar e remover via docker-compose (remove todos os containers do projeto)
echo "📦 Parando containers via docker-compose..."
docker-compose down -v --remove-orphans 2>/dev/null || true
docker-compose rm -f 2>/dev/null || true

# Parar e remover containers com nomes específicos (caso ainda existam de deploy anterior)
echo "🛑 Parando containers do projeto..."
docker stop smartshow-api web-site-smartshow-api-1 2>/dev/null || true

# Remover containers com nomes específicos (múltiplas tentativas)
echo "🗑️ Removendo containers específicos..."
for container_name in smartshow-api web-site-smartshow-api-1; do
    for i in {1..5}; do
        docker rm -f "$container_name" 2>/dev/null && break || sleep 1
    done
done

# Remover qualquer container relacionado ao projeto (por nome ou filtro)
echo "🔍 Buscando containers do projeto..."
CONTAINERS=$(docker ps -aq --filter name=smartshow-api --filter name=web-site-smartshow-api 2>/dev/null || echo "")
if [ -n "$CONTAINERS" ]; then
    echo "🗑️ Removendo containers encontrados: $CONTAINERS"
    echo "$CONTAINERS" | xargs -r docker rm -f 2>/dev/null || true
fi

# Remover containers parados que possam estar causando conflito
echo "🧹 Removendo containers parados..."
docker container prune -f 2>/dev/null || true

# Remover redes
echo "🌐 Removendo redes..."
docker network rm web-site_loja-network 2>/dev/null || true
docker network rm loja-network 2>/dev/null || true

# Limpar redes órfãs
echo "🧹 Limpando redes órfãs..."
docker network prune -f 2>/dev/null || true

# Aguardar um pouco para garantir que tudo foi limpo
sleep 3

echo "✅ Limpeza concluída!"

