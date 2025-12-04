#!/bin/bash
# ========================================
# SCRIPT DE CONFIGURAÇÃO DE HARDWARE
# ========================================

echo "🔌 Configurando hardware..."

# Instalar CUPS (para impressora A4)
echo "📦 Instalando CUPS..."
sudo apt-get update
sudo apt-get install -y cups cups-client

# Adicionar usuário ao grupo lpadmin
sudo usermod -aG lpadmin ubuntu

# Configurar CUPS para acesso remoto (opcional)
sudo cupsctl --remote-any

echo "✅ CUPS instalado!"
echo ""
echo "Para configurar impressoras:"
echo "1. Acesse: http://localhost:631"
echo "2. Adicione sua impressora"
echo ""

# Listar dispositivos USB (para impressora fiscal)
echo "🔍 Dispositivos USB conectados:"
lsusb

echo ""
echo "✅ Configuração concluída!"



















