#!/bin/bash
# ========================================
# SCRIPT PARA CONFIGURAR EC2 MANUALMENTE
# ========================================
# Execute este script na EC2 se o user-data não executou
# Uso: sudo bash configurar-ec2-manual.sh

set -x

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Este script precisa ser executado como root (use sudo)"
    exit 1
fi

# Variáveis (ajuste se necessário)
GITHUB_REPO="https://github.com/Katrashi/smartshow.git"
GITHUB_TOKEN=""  # Deixe vazio se repositório for público

echo "=========================================="
echo "🚀 Configurando EC2 manualmente..."
echo "Data: $(date)"
echo "=========================================="

# Atualizar sistema
echo "📦 Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

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

# Criar diretório da aplicação
echo "📁 Criando diretório da aplicação..."
mkdir -p /opt/smartshow
chown -R ubuntu:ubuntu /opt/smartshow
cd /opt/smartshow

# Clonar repositório
echo "📥 Clonando repositório..."
if [ -d "smartshow" ]; then
    echo "Repositório já existe, removendo..."
    rm -rf smartshow
fi

if [ -n "$GITHUB_TOKEN" ]; then
    REPO_URL_WITH_TOKEN=$(echo "$GITHUB_REPO" | sed "s|https://github.com|https://${GITHUB_TOKEN}@github.com|")
    git clone "$REPO_URL_WITH_TOKEN" smartshow || {
        echo "❌ Erro ao clonar. Tentando novamente..."
        sleep 5
        git clone "$REPO_URL_WITH_TOKEN" smartshow
    }
else
    git clone "$GITHUB_REPO" smartshow || {
        echo "❌ Erro ao clonar. Tentando novamente..."
        sleep 5
        git clone "$GITHUB_REPO" smartshow
    }
fi

cd smartshow
chown -R ubuntu:ubuntu /opt/smartshow

# Ir para diretório web-site
cd web-site

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p api/data api/output api/uploads
chmod -R 777 api/data api/output api/uploads
chown -R ubuntu:ubuntu api/

# Construir e iniciar containers Docker
echo "🏗️ Construindo containers Docker..."
docker-compose down || true

echo "🔨 Construindo imagens Docker..."
if ! docker-compose build --no-cache; then
    echo "⚠️ Build com --no-cache falhou, tentando build normal..."
    docker-compose build || {
        echo "❌ Erro ao construir containers"
        exit 1
    }
fi

echo "🚀 Iniciando aplicação..."
sudo -u ubuntu docker-compose up -d || docker-compose up -d

# Aguardar aplicação iniciar
echo "⏳ Aguardando aplicação iniciar..."
sleep 20

# Verificar status
echo "🔍 Verificando status dos containers..."
docker-compose ps

# Verificar API
echo "🔍 Verificando API..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ API está respondendo!"
        break
    fi
    echo "Tentativa $i/30 - Aguardando API..."
    sleep 3
done

# Configurar Nginx
echo "🌐 Configurando Nginx..."
apt-get install -y nginx || true

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

ln -sf /etc/nginx/sites-available/smartshow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
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
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "aguardando...")
echo "🌐 Aplicação disponível em:"
echo "   - http://${PUBLIC_IP}"
echo "   - http://${PUBLIC_IP}:3000"
echo "=========================================="





