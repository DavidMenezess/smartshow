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

# Remover containers por ID também (caso o nome tenha mudado)
echo "🔍 Buscando containers por ID do erro específico..."
ERROR_CONTAINER_ID="e7a050b80e89aac40358fbef1a77aaecde616e1c6ddd8a0f0a1743875a3d7c0f"
if docker ps -a --format '{{.ID}}' | grep -q "$ERROR_CONTAINER_ID" 2>/dev/null; then
    echo "🗑️ Removendo container pelo ID: $ERROR_CONTAINER_ID"
    docker rm -f "$ERROR_CONTAINER_ID" 2>/dev/null || true
fi

# Remover TODOS os containers que contenham "smartshow" ou "web-site" no nome
echo "🔍 Buscando todos os containers relacionados..."
ALL_CONTAINERS=$(docker ps -a --format '{{.Names}} {{.ID}}' | grep -E "(smartshow|web-site)" | awk '{print $2}' || echo "")
if [ -n "$ALL_CONTAINERS" ]; then
    echo "🗑️ Removendo todos os containers relacionados:"
    echo "$ALL_CONTAINERS" | while read container_id; do
        if [ -n "$container_id" ]; then
            echo "  - Removendo container: $container_id"
            docker rm -f "$container_id" 2>/dev/null || true
        fi
    done
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
sleep 5

# Verificar se ainda há containers com o nome problemático
echo "🔍 Verificando se ainda há containers com nome problemático..."
if docker ps -a --format '{{.Names}}' | grep -q "web-site-smartshow-api-1"; then
    echo "⚠️ Ainda há containers com nome problemático, forçando remoção..."
    docker ps -a --format '{{.Names}} {{.ID}}' | grep "web-site-smartshow-api-1" | awk '{print $2}' | xargs -r docker rm -f 2>/dev/null || true
    sleep 2
fi

echo "✅ Limpeza concluída!"

