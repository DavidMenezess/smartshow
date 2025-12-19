# 🔧 Instalação do Detector Local de Impressoras

Este serviço local detecta automaticamente impressoras no Windows do cliente.

## 📋 Pré-requisitos

1. Node.js instalado (versão 14 ou superior)
2. NPM instalado

## 🚀 Instalação Rápida

### Opção 1: Usar dependências da API (Recomendado)

Se você já tem a API rodando, as dependências já estão instaladas:

```bash
cd web-site/api
npm install express cors
```

Depois, copie `node_modules` para a pasta `web-site/`:

```bash
# No Windows (PowerShell)
cd web-site
xcopy /E /I api\node_modules node_modules
```

### Opção 2: Instalar dependências localmente

```bash
cd web-site
npm init -y
npm install express cors
```

## ▶️ Como Usar

### Método 1: Executar manualmente

1. Abra o arquivo `start-local-detector.bat` (duplo clique)
2. O servidor iniciará na porta 3001
3. Mantenha a janela aberta enquanto usar a aplicação

### Método 2: Executar via linha de comando

```bash
cd web-site
node local-printer-detector.js
```

## ✅ Verificar se está funcionando

Abra no navegador: http://localhost:3001/health

Deve retornar: `{"status":"ok","platform":"win32"}`

## 🔍 Detectar Impressoras

Acesse: http://localhost:3001/detect

Deve retornar uma lista JSON com todas as impressoras detectadas.

## ⚙️ Configuração Automática

A aplicação web tentará automaticamente conectar ao servidor local quando:
- O cliente estiver no Windows
- O servidor local estiver rodando na porta 3001

## 🛠️ Solução de Problemas

### Erro: "Cannot find module 'express'"

**Solução:** Instale as dependências:
```bash
cd web-site
npm install express cors
```

### Erro: "Port 3001 already in use"

**Solução:** Altere a porta no arquivo `local-printer-detector.js`:
```javascript
const PORT = 3002; // Use outra porta
```

### Impressoras não aparecem

1. Verifique se o servidor local está rodando
2. Verifique se as impressoras estão instaladas no Windows
3. Abra o console do navegador (F12) para ver os logs

## 📝 Notas

- O servidor local roda apenas no Windows
- Mantenha o servidor rodando enquanto usar a aplicação
- O servidor detecta automaticamente todas as impressoras instaladas

