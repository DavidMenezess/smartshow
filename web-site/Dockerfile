# ========================================
# DOCKERFILE - LOJA ELETRÔNICOS
# ========================================

FROM node:18-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcups2-dev \
    curl \
    build-essential \
    udev \
    libusb-1.0-0-dev \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e instalar dependências
COPY api/package*.json ./
RUN npm install --production

# Copiar código da aplicação
COPY api/ ./
COPY src/ ../src/

# Criar diretórios necessários com permissões corretas
RUN mkdir -p data output uploads && \
    chmod -R 777 data output uploads

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicialização
CMD ["node", "server.js"]


