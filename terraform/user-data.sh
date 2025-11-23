#!/bin/bash
# ========================================
# SCRIPT DE INICIALIZAÇÃO AUTOMÁTICA
# ========================================
# Este script é executado automaticamente quando a instância EC2 inicia
# Ele instala Docker, clona o repositório e inicia a aplicação

# Mostrar todos os comandos executados
set -x

# Log de inicialização (redirecionar tudo para arquivo de log)
exec > >(tee -a /var/log/user-data.log) 2>&1
exec 1> >(tee -a /var/log/user-data.log)
exec 2> >(tee -a /var/log/user-data.log >&2)

# Função para log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/user-data.log
}

log "=========================================="
log "🚀 Iniciando configuração automática..."
log "Data: $(date)"
log "=========================================="
echo "=========================================="
echo "🚀 Iniciando configuração automática..."
echo "Data: $(date)"
echo "=========================================="

# Atualizar sistema
log "📦 Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y || { log "❌ Erro ao atualizar repositórios"; exit 1; }
apt-get upgrade -y || log "⚠️ Aviso: Alguns pacotes não puderam ser atualizados"

# Instalar dependências básicas
echo "📦 Instalando dependências..."
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release

# Instalar Docker
echo "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    # Adicionar repositório Docker
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Instalar Docker Compose (standalone)
echo "🐳 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Iniciar e habilitar Docker
echo "🐳 Configurando Docker..."
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu

# Aguardar Docker estar pronto
echo "⏳ Aguardando Docker estar pronto..."
sleep 10
until docker info > /dev/null 2>&1; do
    echo "Aguardando Docker..."
    sleep 2
done

# Garantir que o usuário ubuntu pode usar Docker sem logout
echo "🔧 Configurando permissões Docker..."
newgrp docker << EOF || true
EOF
# Alternativa: usar sudo -u ubuntu para comandos docker

# Criar diretório da aplicação
echo "📁 Criando diretório da aplicação..."
mkdir -p /opt/smartshow
# Garantir que o diretório pertence ao usuário ubuntu
chown -R ubuntu:ubuntu /opt/smartshow || true
cd /opt/smartshow

# Clonar repositório
echo "📥 Clonando repositório..."
if [ -d "smartshow" ]; then
    echo "Repositório já existe, removendo para clonar novamente..."
    rm -rf smartshow
fi

# Configurar autenticação se token fornecido
if [ -n "${github_token}" ]; then
    echo "🔐 Configurando autenticação GitHub..."
    # Modificar URL do repositório para incluir token
    REPO_URL_WITH_TOKEN=$(echo "${github_repo}" | sed "s|https://github.com|https://${github_token}@github.com|")
    
    # Tentar clonar com retry
    MAX_RETRIES=3
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if git clone "$REPO_URL_WITH_TOKEN" smartshow; then
            echo "✅ Repositório clonado com sucesso!"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo "❌ Erro ao clonar (tentativa $RETRY_COUNT/$MAX_RETRIES). Tentando novamente em 5 segundos..."
                sleep 5
            else
                echo "❌ Erro ao clonar após $MAX_RETRIES tentativas"
                exit 1
            fi
        fi
    done
else
    # Repositório público - clonar normalmente
    MAX_RETRIES=3
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if git clone "${github_repo}" smartshow; then
            echo "✅ Repositório clonado com sucesso!"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo "❌ Erro ao clonar (tentativa $RETRY_COUNT/$MAX_RETRIES). Tentando novamente em 5 segundos..."
                sleep 5
            else
                echo "❌ Erro ao clonar após $MAX_RETRIES tentativas"
                exit 1
            fi
        fi
    done
fi

cd smartshow
# Corrigir propriedade após clonar
echo "🔧 Corrigindo propriedade dos arquivos..."
chown -R ubuntu:ubuntu /opt/smartshow || true

# Garantir que estamos no diretório correto ANTES de qualquer comando docker-compose
log "📂 Mudando para diretório web-site..."
cd /opt/smartshow/smartshow/web-site || {
    log "❌ Erro: Diretório web-site não encontrado!"
    log "📋 Conteúdo de /opt/smartshow/smartshow:"
    ls -la /opt/smartshow/smartshow/ || true
    exit 1
}

log "✅ Diretório atual: $(pwd)"
log "📋 Verificando docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    log "❌ Erro: docker-compose.yml não encontrado em $(pwd)!"
    log "📋 Arquivos no diretório:"
    ls -la || true
    exit 1
fi

# Criar diretórios necessários
log "📁 Criando diretórios..."
mkdir -p api/data api/output api/uploads
chmod -R 777 api/data api/output api/uploads || chmod -R 755 api/
chown -R ubuntu:ubuntu api/ || true

# Instalar Node.js (se necessário para build)
log "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Instalar dependências da API (se necessário)
if [ -f "api/package.json" ]; then
    log "📦 Instalando dependências da API..."
    cd api
    npm install --production || npm install
    cd /opt/smartshow/smartshow/web-site
fi

# Construir e iniciar containers Docker
log "🏗️ Construindo containers Docker..."
# Parar containers existentes se houver (agora estamos no diretório correto)
docker-compose down || true

# Construir imagens (com retry se necessário)
log "🔨 Construindo imagens Docker..."
if ! docker-compose build --no-cache; then
    log "⚠️ Build com --no-cache falhou, tentando build normal..."
    if ! docker-compose build; then
        log "❌ Erro ao construir containers"
        log "📋 Verificando docker-compose.yml..."
        ls -la docker-compose.yml || log "❌ docker-compose.yml não encontrado!"
        exit 1
    fi
fi

log "🚀 Iniciando aplicação..."
# Garantir que docker-compose está no PATH
export PATH=$PATH:/usr/local/bin
# Executar docker-compose (já estamos como root no user-data, então não precisa sudo)
# Mas garantir que o usuário ubuntu pode usar docker depois
log "🔧 Garantindo que usuário ubuntu pode usar Docker..."
usermod -aG docker ubuntu || true
# Corrigir permissões do socket Docker
chmod 666 /var/run/docker.sock 2>/dev/null || chown root:docker /var/run/docker.sock || true
# Executar docker-compose (já estamos como root no user-data)
docker-compose up -d || {
    log "❌ Erro ao iniciar containers"
    log "📋 Tentando novamente em 5 segundos..."
    sleep 5
    docker-compose up -d || {
        log "❌ Erro ao iniciar containers após retry"
        exit 1
    }
}

# Aguardar aplicação iniciar
echo "⏳ Aguardando aplicação iniciar..."
sleep 20

# Verificar se containers estão rodando
echo "🔍 Verificando status dos containers..."
docker-compose ps

# Aguardar containers ficarem healthy
echo "⏳ Aguardando containers ficarem prontos..."
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    HEALTHY=$(docker-compose ps | grep -c "healthy\|Up" || echo "0")
    if [ "$HEALTHY" -gt "0" ]; then
        echo "✅ Containers estão rodando!"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 5))
    echo "Aguardando containers... ($WAIT_COUNT/$MAX_WAIT segundos)"
    sleep 5
done

# Verificar se API está respondendo
echo "🔍 Verificando API..."
MAX_RETRIES=30
RETRY_COUNT=0
API_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ API está respondendo!"
        API_READY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Tentativa $RETRY_COUNT/$MAX_RETRIES - Aguardando API..."
    sleep 3
done

if [ "$API_READY" = false ]; then
    echo "⚠️ API não está respondendo após $MAX_RETRIES tentativas"
    echo "📋 Logs dos containers:"
    docker-compose logs --tail=50
fi

# Configurar Nginx para redirecionar porta 80 para 3000
echo "🌐 Configurando Nginx..."
apt-get install -y nginx || true

# Criar configuração Nginx
cat > /etc/nginx/sites-available/smartshow << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_CONFIG

# Habilitar site
ln -sf /etc/nginx/sites-available/smartshow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar Nginx
nginx -t && systemctl restart nginx
systemctl enable nginx

# Log final
echo "=========================================="
echo "✅ Configuração concluída!"
echo "Data: $(date)"
echo "=========================================="
echo "📊 Status dos containers:"
docker-compose ps
echo ""
echo "📋 Últimos logs da aplicação:"
docker-compose logs --tail=20 || true
echo ""
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "aguardando...")
echo "🌐 Aplicação disponível em:"
echo "   - http://$${PUBLIC_IP}"
echo "   - http://$${PUBLIC_IP}:3000"
echo ""
echo "🔍 Para verificar logs:"
echo "   docker-compose -f /opt/smartshow/smartshow/web-site/docker-compose.yml logs -f"
echo ""
echo "🔍 Para verificar status:"
echo "   docker-compose -f /opt/smartshow/smartshow/web-site/docker-compose.yml ps"
echo "=========================================="

# Criar script de verificação para facilitar troubleshooting
cat > /home/ubuntu/verificar-aplicacao.sh << 'VERIFY_SCRIPT'
#!/bin/bash
echo "🔍 Verificando aplicação..."
cd /opt/smartshow/smartshow/web-site
echo ""
echo "📊 Status dos containers:"
docker-compose ps
echo ""
echo "📋 Últimos logs:"
docker-compose logs --tail=30
echo ""
echo "🌐 Testando API:"
curl -f http://localhost:3000/api/health && echo "✅ API OK!" || echo "❌ API não está respondendo"
VERIFY_SCRIPT

chmod +x /home/ubuntu/verificar-aplicacao.sh
chown ubuntu:ubuntu /home/ubuntu/verificar-aplicacao.sh

