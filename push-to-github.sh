#!/bin/bash
# Script para fazer push para o GitHub

echo "🚀 Configurando repositório GitHub..."

# Verificar se o remote já existe
if git remote get-url origin &> /dev/null; then
    echo "⚠️  Remote 'origin' já existe. Removendo..."
    git remote remove origin
fi

# Solicitar nome de usuário do GitHub
read -p "Digite seu nome de usuário do GitHub: " GITHUB_USER

# Adicionar remote
git remote add origin https://github.com/${GITHUB_USER}/smartshow.git

echo "✅ Remote configurado!"
echo ""
echo "📤 Fazendo push para o GitHub..."

# Fazer push
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push realizado com sucesso!"
    echo "🌐 Repositório: https://github.com/${GITHUB_USER}/smartshow"
else
    echo ""
    echo "❌ Erro ao fazer push."
    echo "💡 Verifique se:"
    echo "   1. O repositório 'smartshow' existe no GitHub"
    echo "   2. Você tem permissão para fazer push"
    echo "   3. Suas credenciais estão configuradas"
fi










