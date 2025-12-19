# 🚀 Início Rápido - Detector de Impressoras

## ⚡ Instalação em 3 Passos

### 1️⃣ Instalar Dependências

Abra o PowerShell ou CMD na pasta do projeto e execute:

```bash
cd web-site/api
npm install express cors
```

### 2️⃣ Iniciar Servidor Local

**Opção A:** Duplo clique no arquivo `start-local-detector.bat`

**Opção B:** Via linha de comando:
```bash
cd web-site
node local-printer-detector.js
```

### 3️⃣ Usar a Aplicação

1. Abra a aplicação web no navegador
2. Vá em **Configurações** → **Impressoras**
3. Clique em **🔄 Atualizar Lista**
4. As impressoras serão detectadas **AUTOMATICAMENTE**! ✅

## ✅ Verificar se Funcionou

Abra no navegador: http://localhost:3001/health

Se retornar `{"status":"ok","platform":"win32"}`, está funcionando! ✅

## 🔧 Solução de Problemas

### ❌ "Cannot find module 'express'"

**Solução:**
```bash
cd web-site/api
npm install express cors
```

### ❌ Porta 3001 já em uso

**Solução:** Feche outros programas usando a porta 3001 ou altere a porta no arquivo `local-printer-detector.js`

### ❌ Impressoras não aparecem

1. Verifique se o servidor local está rodando (veja a janela do terminal)
2. Verifique se as impressoras estão instaladas no Windows
3. Abra o console do navegador (F12) para ver os logs

## 📝 Notas Importantes

- ⚠️ **Mantenha o servidor local rodando** enquanto usar a aplicação
- ✅ A detecção é **100% automática** quando o servidor local está ativo
- 🔄 O servidor local detecta **TODAS** as impressoras instaladas no Windows

