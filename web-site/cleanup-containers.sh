#!/bin/bash
# Script para limpar completamente containers Docker antes do deploy

# NÃO usar set -e aqui, queremos continuar mesmo se alguns comandos falharem
set +e

echo "🛑 Iniciando limpeza completa de containers..."

# PRIMEIRO: Parar TODOS os containers relacionados (mais agressivo)
echo "🛑 Parando TODOS os containers do projeto..."
docker stop $(docker ps -q --filter name=smartshow) 2>/dev/null || true
docker stop $(docker ps -q --filter name=web-site) 2>/dev/null || true
docker stop smartshow-api web-site-smartshow-api-1 2>/dev/null || true

# Parar containers por ID também (para pegar containers com prefixos)
docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | awk '{print $2}' | xargs -r docker stop 2>/dev/null || true
docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | awk '{print $2}' | xargs -r docker kill 2>/dev/null || true

# Parar e remover via docker-compose (remove todos os containers do projeto)
echo "📦 Parando containers via docker-compose..."
# Primeiro, parar todos os containers que podem estar rodando
docker-compose ps -q | xargs -r docker stop 2>/dev/null || true
docker-compose ps -q | xargs -r docker kill 2>/dev/null || true
# Usar down com todas as opções para garantir remoção completa
docker-compose down -v --remove-orphans --rmi local 2>/dev/null || true
docker-compose rm -f -v 2>/dev/null || true
# Tentar novamente com mais força
docker-compose down --remove-orphans 2>/dev/null || true

# Remover containers com nomes específicos (múltiplas tentativas com mais força)
echo "🗑️ Removendo containers específicos (tentativas agressivas)..."
for container_name in smartshow-api web-site-smartshow-api-1; do
    # Tentar remover pelo nome
    for i in {1..10}; do
        docker rm -f "$container_name" 2>/dev/null && break || sleep 0.5
    done
    
    # Se ainda existir, tentar encontrar pelo ID e remover
    CONTAINER_ID=$(docker ps -a --filter name="^${container_name}$" --format '{{.ID}}' 2>/dev/null || echo "")
    if [ -n "$CONTAINER_ID" ]; then
        echo "⚠️ Container $container_name ainda existe (ID: $CONTAINER_ID), forçando remoção..."
        docker stop "$CONTAINER_ID" 2>/dev/null || true
        docker rm -f "$CONTAINER_ID" 2>/dev/null || true
        sleep 1
    fi
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
    for container_id in $ALL_CONTAINERS; do
        if [ -n "$container_id" ]; then
            echo "  - Parando e removendo container: $container_id"
            docker stop "$container_id" 2>/dev/null || true
            docker rm -f "$container_id" 2>/dev/null || true
        fi
    done
fi

# Remover também por filtro direto do Docker
echo "🔍 Removendo containers por filtro Docker..."
docker ps -aq --filter name=smartshow | xargs -r docker rm -f 2>/dev/null || true
docker ps -aq --filter name=web-site | xargs -r docker rm -f 2>/dev/null || true

# Remover containers parados que possam estar causando conflito
echo "🧹 Removendo containers parados..."
docker container prune -f 2>/dev/null || true

# Remover redes ANTES de tentar criar novas (importante para evitar conflitos)
echo "🌐 Removendo redes..."
docker network rm web-site_loja-network 2>/dev/null || true
docker network rm loja-network 2>/dev/null || true

# Limpar redes órfãs
echo "🧹 Limpando redes órfãs..."
docker network prune -f 2>/dev/null || true

# Aguardar um pouco para garantir que tudo foi limpo
echo "⏳ Aguardando limpeza completa..."
sleep 5

# Verificação final: garantir que NÃO há containers com o nome problemático
echo "🔍 Verificação final: containers problemáticos..."
# Buscar por qualquer container que contenha "web-site-smartshow-api" ou "smartshow-api" no nome
PROBLEMATIC_CONTAINERS=$(docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" || echo "")
if [ -n "$PROBLEMATIC_CONTAINERS" ]; then
    echo "⚠️ AINDA há containers problemáticos encontrados:"
    echo "$PROBLEMATIC_CONTAINERS"
    echo "🗑️ Forçando remoção final (múltiplas tentativas)..."
    for attempt in {1..15}; do
        echo "  Tentativa $attempt de 15..."
        
        # Parar TODOS os containers que contenham o padrão no nome
        docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | awk '{print $2}' | while read container_id; do
            if [ -n "$container_id" ]; then
                echo "    - Parando container ID: $container_id"
                docker kill "$container_id" 2>/dev/null || true
                docker stop "$container_id" 2>/dev/null || true
            fi
        done
        sleep 1
        
        # Remover TODOS os containers que contenham o padrão no nome
        docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | awk '{print $2}' | while read container_id; do
            if [ -n "$container_id" ]; then
                echo "    - Removendo container ID: $container_id"
                docker rm -f "$container_id" 2>/dev/null || true
            fi
        done
        
        # Também remover por nome parcial (para pegar containers com prefixos)
        docker ps -a --format '{{.Names}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | while read container_name; do
            if [ -n "$container_name" ]; then
                echo "    - Removendo container por nome: $container_name"
                docker kill "$container_name" 2>/dev/null || true
                docker rm -f "$container_name" 2>/dev/null || true
            fi
        done
        
        sleep 2
        
        # Verificar se ainda existem
        REMAINING=$(docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" || echo "")
        if [ -z "$REMAINING" ]; then
            echo "  ✅ Todos os containers foram removidos na tentativa $attempt"
            break
        else
            echo "  ⚠️ Ainda restam containers: $REMAINING"
        fi
    done
    sleep 3
else
    echo "✅ Nenhum container problemático encontrado"
fi

# Verificação final dupla - buscar por qualquer padrão
FINAL_CHECK=$(docker ps -a --format '{{.Names}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | wc -l || echo "0")
if [ "$FINAL_CHECK" -gt 0 ]; then
    echo "❌ ERRO: Ainda existem $FINAL_CHECK container(s) problemático(s) após limpeza!"
    echo "📋 Containers encontrados:"
    docker ps -a --format '{{.Names}} {{.ID}} {{.Status}}' | grep -iE "(web-site.*smartshow|smartshow.*api)"
    echo "💡 Tentando remoção final agressiva..."
    
    # Remover por ID
    docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | awk '{print $2}' | xargs -r docker kill 2>/dev/null || true
    docker ps -a --format '{{.Names}} {{.ID}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | awk '{print $2}' | xargs -r docker rm -f 2>/dev/null || true
    
    # Remover por nome (para pegar containers com prefixos)
    docker ps -a --format '{{.Names}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | xargs -r -I {} docker kill {} 2>/dev/null || true
    docker ps -a --format '{{.Names}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | xargs -r -I {} docker rm -f {} 2>/dev/null || true
    
    sleep 3
    FINAL_CHECK_2=$(docker ps -a --format '{{.Names}}' | grep -iE "(web-site.*smartshow|smartshow.*api)" | wc -l || echo "0")
    if [ "$FINAL_CHECK_2" -gt 0 ]; then
        echo "⚠️ Ainda restam $FINAL_CHECK_2 containers, mas continuando..."
        # Não sair com erro, apenas avisar
    else
        echo "✅ Containers removidos com sucesso após kill!"
    fi
else
    echo "✅ Limpeza concluída com sucesso! Nenhum container problemático restante."
fi

