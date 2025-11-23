#!/bin/bash
# ========================================
# SCRIPT DE VERIFICAÇÃO E CORREÇÃO
# ========================================
# Execute este script na instância EC2 para verificar e corrigir problemas

echo "=========================================="
echo "🔍 Verificando instância EC2..."
echo "=========================================="

# 1. Verificar logs do user-data
echo ""
echo "📋 1. Logs do user-data:"
echo "----------------------------------------"
if [ -f /var/log/user-data.log ]; then
    echo "✅ Arquivo de log existe"
    echo "Últimas 20 linhas:"
    tail -20 /var/log/user-data.log
else
    echo "❌ Arquivo de log não encontrado"
fi

# 2. Verificar Docker
echo ""
echo "🐳 2. Status do Docker:"
echo "----------------------------------------"
if command -v docker &> /dev/null; then
    echo "✅ Docker instalado: $(docker --version)"
    if systemctl is-active --quiet docker; then
        echo "✅ Docker está rodando"
    else
        echo "❌ Docker não está rodando. Iniciando..."
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
else
    echo "❌ Docker não instalado"
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# 3. Verificar repositório
echo ""
echo "📁 3. Verificando repositório:"
echo "----------------------------------------"
if [ -d "/opt/smartshow/smartshow" ]; then
    echo "✅ Repositório existe em /opt/smartshow/smartshow"
    cd /opt/smartshow/smartshow
    echo "Diretório atual: $(pwd)"
    ls -la
else
    echo "❌ Repositório não encontrado"
    echo "Criando diretório..."
    sudo mkdir -p /opt/smartshow
    cd /opt/smartshow
    echo "⚠️ Você precisa clonar o repositório manualmente"
    echo "Execute: git clone https://SEU_TOKEN@github.com/Katrashi/smartshow.git"
fi

# 4. Verificar docker-compose
echo ""
echo "🐳 4. Verificando docker-compose:"
echo "----------------------------------------"
if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose instalado: $(docker-compose --version)"
else
    echo "❌ docker-compose não instalado"
    echo "Instalando docker-compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 5. Verificar containers
echo ""
echo "📦 5. Status dos containers:"
echo "----------------------------------------"
if [ -d "/opt/smartshow/smartshow/web-site" ]; then
    cd /opt/smartshow/smartshow/web-site
    if [ -f "docker-compose.yml" ]; then
        echo "✅ docker-compose.yml encontrado"
        echo "Containers:"
        docker-compose ps
        echo ""
        echo "Últimos logs:"
        docker-compose logs --tail=20
    else
        echo "❌ docker-compose.yml não encontrado"
    fi
else
    echo "❌ Diretório web-site não encontrado"
fi

# 6. Tentar iniciar aplicação
echo ""
echo "🚀 6. Tentando iniciar aplicação:"
echo "----------------------------------------"
if [ -d "/opt/smartshow/smartshow/web-site" ]; then
    cd /opt/smartshow/smartshow/web-site
    if [ -f "docker-compose.yml" ]; then
        echo "Construindo containers..."
        docker-compose build --no-cache || docker-compose build
        
        echo "Iniciando containers..."
        docker-compose up -d
        
        echo "Aguardando 10 segundos..."
        sleep 10
        
        echo "Status final:"
        docker-compose ps
        
        echo ""
        echo "Logs da aplicação:"
        docker-compose logs --tail=30
    fi
fi

# 7. Verificar portas
echo ""
echo "🌐 7. Verificando portas:"
echo "----------------------------------------"
echo "Porta 80 (HTTP):"
sudo netstat -tlnp | grep :80 || echo "Porta 80 não está em uso"
echo ""
echo "Porta 3000 (API):"
sudo netstat -tlnp | grep :3000 || echo "Porta 3000 não está em uso"

# 8. IP Público
echo ""
echo "📍 8. IP Público:"
echo "----------------------------------------"
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "IP Público: $PUBLIC_IP"
echo "Acesse: http://$PUBLIC_IP"
echo "API: http://$PUBLIC_IP:3000"

echo ""
echo "=========================================="
echo "✅ Verificação concluída!"
echo "=========================================="







