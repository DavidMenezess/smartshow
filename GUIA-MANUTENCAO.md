# 🔧 Guia de Manutenção e Alterações

## 📋 Índice

1. [Onde Fazer Cada Tipo de Alteração](#onde-fazer-cada-tipo-de-alteração)
2. [Alterações Comuns](#alterações-comuns)
3. [Estrutura de Arquivos Explicada](#estrutura-de-arquivos-explicada)
4. [Fluxo de Trabalho Recomendado](#fluxo-de-trabalho-recomendado)

---

## 🎯 Onde Fazer Cada Tipo de Alteração

### **1. Alterar Dados da Empresa (Nome, CNPJ, Endereço)**

**📍 Localização:** `web-site/api/services/pdfGenerator.js`

**O que alterar:**
```javascript
// Linha ~20-25
doc.text('NOME DA SUA EMPRESA', { align: 'center' })
   .text('CNPJ: 00.000.000/0001-00', { align: 'center' })
   .text('Endereço: Rua Exemplo, 123', { align: 'center' })
```

**Como alterar:**
1. Abra o arquivo `web-site/api/services/pdfGenerator.js`
2. Procure por "NOME DA SUA EMPRESA"
3. Substitua pelos dados reais da sua empresa
4. Salve o arquivo
5. Reinicie o servidor: `docker-compose restart` (ou `npm restart` em desenvolvimento)

---

### **2. Adicionar/Remover Campos no Cadastro de Produtos**

**📍 Localização:** 
- Backend: `web-site/api/routes/products.js`
- Frontend: `web-site/src/produtos.html` (quando criado)
- Banco: `web-site/api/database.js` (tabela `products`)

**Exemplo - Adicionar campo "Garantia":**

**Passo 1:** Alterar banco de dados (`web-site/api/database.js`)
```javascript
// Linha ~93-102 - Adicionar coluna na tabela
CREATE TABLE IF NOT EXISTS products (
    ...
    warranty TEXT,  // ← ADICIONAR ESTA LINHA
    ...
)
```

**Passo 2:** Alterar rota de criação (`web-site/api/routes/products.js`)
```javascript
// Linha ~80-90 - Adicionar no POST
router.post('/', async (req, res) => {
    const { ..., warranty } = req.body;  // ← ADICIONAR
    
    await db.run(
        `INSERT INTO products (..., warranty) VALUES (..., ?)`,  // ← ADICIONAR
        [..., warranty]  // ← ADICIONAR
    );
});
```

**Passo 3:** Alterar frontend (quando tiver tela de produtos)
- Adicionar campo no formulário HTML
- Enviar no JSON da requisição

---

### **3. Alterar Formas de Pagamento**

**📍 Localização:** `web-site/src/pdv.html`

**O que alterar:**
```html
<!-- Linha ~80-90 -->
<select id="paymentMethod" class="form-control">
    <option value="Dinheiro">Dinheiro</option>
    <option value="Cartão de Débito">Cartão de Débito</option>
    <option value="Cartão de Crédito">Cartão de Crédito</option>
    <option value="PIX">PIX</option>
    <!-- ADICIONAR NOVAS OPÇÕES AQUI -->
    <option value="Boleto">Boleto</option>
    <option value="Crediário">Crediário</option>
</select>
```

**Como alterar:**
1. Abra `web-site/src/pdv.html`
2. Encontre o `<select id="paymentMethod">`
3. Adicione ou remova opções `<option>`
4. Salve e recarregue a página (não precisa reiniciar servidor)

---

### **4. Alterar Layout/Design (Cores, Fontes, Tamanhos)**

**📍 Localização:** `web-site/src/css/styles.css`

**Exemplo - Alterar cor principal:**

```css
/* Linha ~15-20 - Cores principais */
.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* ↑ ALTERE ESTAS CORES */
}

/* Linha ~200-210 - Botões */
.btn-primary {
    background: #667eea;  /* ← ALTERE AQUI */
}
```

**Como alterar:**
1. Abra `web-site/src/css/styles.css`
2. Procure pela classe ou elemento que quer alterar
3. Modifique as propriedades CSS
4. Salve e recarregue a página

**💡 Dica:** Use um editor com preview ou extensão "Live Server" para ver mudanças em tempo real.

---

### **5. Adicionar Novas Telas/Páginas**

**📍 Localização:** `web-site/src/`

**Passo a passo:**

1. **Criar arquivo HTML:**
   ```bash
   # Criar novo arquivo, exemplo: estoque.html
   cp web-site/src/pdv.html web-site/src/estoque.html
   ```

2. **Adicionar no menu de navegação:**
   - Abra `web-site/src/index.html`
   - Encontre a seção `<nav class="nav">`
   - Adicione: `<a href="estoque.html" class="nav-item">Estoque</a>`

3. **Criar JavaScript específico (se necessário):**
   ```bash
   # Criar arquivo JS
   touch web-site/src/js/estoque.js
   ```

4. **Adicionar rota na API (se necessário):**
   - Criar arquivo: `web-site/api/routes/estoque.js`
   - Adicionar em `web-site/api/routes/index.js`:
     ```javascript
     const estoqueRoutes = require('./estoque');
     router.use('/estoque', estoqueRoutes);
     ```

---

### **6. Alterar Configurações do Banco de Dados**

**📍 Localização:** `web-site/api/database.js`

**Exemplo - Adicionar nova tabela:**

```javascript
// Linha ~30-130 - Adicionar nova tabela no array `tables`
const tables = [
    // ... tabelas existentes ...
    
    // NOVA TABELA
    `CREATE TABLE IF NOT EXISTS minha_tabela (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
];
```

**⚠️ Importante:** 
- Alterações na estrutura do banco requerem migração de dados
- Faça backup antes: `./scripts/backup.sh`
- Em produção, pare o servidor antes de alterar

---

### **7. Configurar Impressoras**

**📍 Localização:** `web-site/api/config.js` ou `.env`

**Opção 1 - Via arquivo .env (Recomendado):**
```bash
# Criar/editar arquivo .env
cd web-site
cp .env.example .env

# Editar .env
FISCAL_PRINTER_TYPE=usb
FISCAL_PRINTER_VENDOR_ID=0x04f9
FISCAL_PRINTER_PRODUCT_ID=0x20e8
```

**Opção 2 - Via código (`web-site/api/config.js`):**
```javascript
// Linha ~30-50
printers: {
    fiscal: {
        type: 'usb',  // ou 'network'
        usb: {
            vendorId: '0x04f9',   // ← ALTERE AQUI
            productId: '0x20e8'   // ← ALTERE AQUI
        }
    }
}
```

**Como descobrir Vendor ID e Product ID:**
```bash
# No servidor Linux
lsusb

# Saída exemplo:
# Bus 001 Device 003: ID 04f9:20e8 Brother Industries
# Vendor ID: 04f9
# Product ID: 20e8
```

---

### **8. Alterar Porta da API**

**📍 Localização:** `web-site/api/config.js` ou `.env`

**Via .env (Recomendado):**
```bash
# .env
PORT=3000  # ← ALTERE AQUI
```

**Via código:**
```javascript
// web-site/api/config.js - Linha ~10
api: {
    port: process.env.PORT || 3000,  // ← ALTERE O VALOR PADRÃO
}
```

**⚠️ Lembre-se de:**
- Alterar também no `docker-compose.yml` se usar Docker
- Alterar no Terraform (`terraform/variables.tf`) se necessário
- Atualizar Security Groups na AWS

---

### **9. Adicionar Novos Relatórios**

**📍 Localização:** `web-site/api/routes/reports.js`

**Exemplo - Criar relatório de estoque:**

```javascript
// Adicionar nova rota
router.get('/stock', async (req, res) => {
    try {
        const products = await db.all(`
            SELECT * FROM products 
            WHERE stock < min_stock 
            ORDER BY stock ASC
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

**Depois criar tela no frontend:**
- Criar `web-site/src/relatorio-estoque.html`
- Adicionar JavaScript para chamar a API
- Adicionar link no menu

---

### **10. Alterar Usuários Padrão/Senhas**

**📍 Localização:** `web-site/api/database.js`

**O que alterar:**
```javascript
// Linha ~140-180 - Função insertInitialData()
const initialUsers = [
    {
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),  // ← ALTERE A SENHA
        name: 'Administrador',
        role: 'admin'
    },
    // ... outros usuários
];
```

**⚠️ Importante:**
- Senhas são criptografadas com bcrypt
- Use: `bcrypt.hashSync('sua-senha', 10)`
- Ou altere via interface depois de logado

---

## 🔄 Alterações Comuns

### **Mudar Logo da Empresa**

**Onde:** `web-site/src/index.html` e outras páginas HTML

```html
<!-- Adicionar logo no header -->
<header class="header">
    <img src="images/logo.png" alt="Logo" style="height: 40px;">
    <h1>Loja de Eletrônicos</h1>
    ...
</header>
```

**Passos:**
1. Coloque a imagem em `web-site/src/images/logo.png`
2. Adicione a tag `<img>` no HTML
3. Ajuste o CSS se necessário

---

### **Alterar Textos/Mensagens**

**Onde:** Arquivos HTML e JavaScript

**Exemplos:**
- `web-site/src/index.html` - Títulos, textos da página
- `web-site/src/js/pdv.js` - Mensagens de alerta, confirmação
- `web-site/api/routes/*.js` - Mensagens de erro da API

**Buscar e substituir:**
```bash
# Procurar texto em todos os arquivos
grep -r "texto a procurar" web-site/src/
```

---

### **Adicionar Validações**

**Onde:** `web-site/src/js/pdv.js` e outros arquivos JS

**Exemplo - Validar CPF:**
```javascript
// Adicionar função de validação
function validarCPF(cpf) {
    // ... código de validação
}

// Usar na validação do formulário
if (!validarCPF(cpf)) {
    alert('CPF inválido!');
    return false;
}
```

---

## 📁 Estrutura de Arquivos Explicada

```
loja-eletronicos/
│
├── web-site/
│   ├── src/                    ← FRONTEND (Interface)
│   │   ├── *.html             ← Telas do sistema
│   │   ├── css/               ← Estilos (cores, layout)
│   │   └── js/                ← Lógica do frontend
│   │
│   └── api/                   ← BACKEND (Servidor)
│       ├── server.js          ← Configuração do servidor
│       ├── database.js        ← Banco de dados (estrutura)
│       ├── config.js          ← Configurações gerais
│       ├── routes/            ← Endpoints da API
│       └── services/          ← Serviços (impressoras, PDF)
│
├── terraform/                  ← INFRAESTRUTURA AWS
│   ├── *.tf                    ← Configuração AWS
│   └── terraform.tfvars        ← Variáveis (IP, região, etc)
│
└── scripts/                    ← SCRIPTS ÚTEIS
    ├── deploy.sh               ← Deploy na AWS
    ├── backup.sh               ← Backup do banco
    └── update.sh               ← Atualizar aplicação
```

---

## 🔄 Fluxo de Trabalho Recomendado

### **Para Alterações Simples (Frontend):**

1. **Editar arquivo:**
   ```bash
   # Exemplo: alterar cor
   nano web-site/src/css/styles.css
   ```

2. **Testar localmente:**
   ```bash
   cd web-site/api
   npm start
   # Acessar http://localhost:3000
   ```

3. **Fazer commit:**
   ```bash
   git add .
   git commit -m "Alterar cor do header"
   ```

4. **Deploy (se em produção):**
   ```bash
   ./scripts/update.sh
   ```

---

### **Para Alterações no Banco de Dados:**

1. **⚠️ Fazer backup primeiro:**
   ```bash
   ./scripts/backup.sh
   ```

2. **Editar estrutura:**
   ```bash
   nano web-site/api/database.js
   ```

3. **Parar servidor:**
   ```bash
   docker-compose stop
   # ou
   npm stop
   ```

4. **Aplicar mudanças:**
   - Deletar banco antigo (se necessário)
   - Reiniciar servidor (cria novo banco)

5. **Testar:**
   - Verificar se dados foram migrados
   - Testar funcionalidades

---

### **Para Alterações na API:**

1. **Editar rota:**
   ```bash
   nano web-site/api/routes/products.js
   ```

2. **Testar localmente:**
   ```bash
   npm start
   # Testar com Postman ou curl
   ```

3. **Atualizar frontend (se necessário):**
   - Ajustar chamadas da API
   - Testar integração

4. **Deploy:**
   ```bash
   ./scripts/update.sh
   ```

---

## 🛠️ Ferramentas Úteis

### **Editor Recomendado:**
- **VS Code** com extensões:
  - ESLint (JavaScript)
  - Prettier (formatação)
  - Live Server (preview HTML)

### **Testar API:**
- **Postman** ou **Insomnia**
- Ou via terminal: `curl http://localhost:3000/api/health`

### **Ver Logs:**
```bash
# Docker
docker-compose logs -f api

# Node.js direto
npm start  # Logs aparecem no terminal
```

---

## 📞 Precisa de Ajuda?

### **Problemas Comuns:**

1. **"Erro ao conectar banco"**
   - Verificar permissões do diretório `data/`
   - Verificar se arquivo existe

2. **"Mudanças não aparecem"**
   - Limpar cache do navegador (Ctrl+F5)
   - Reiniciar servidor
   - Verificar se arquivo foi salvo

3. **"Erro 500 na API"**
   - Ver logs: `docker-compose logs api`
   - Verificar sintaxe do código
   - Verificar banco de dados

---

## ✅ Checklist Antes de Fazer Alterações

- [ ] Fazer backup do banco de dados
- [ ] Testar em ambiente de desenvolvimento primeiro
- [ ] Documentar a alteração (comentário no código)
- [ ] Testar todas as funcionalidades relacionadas
- [ ] Verificar se não quebrou nada existente
- [ ] Fazer commit com mensagem descritiva

---

**💡 Dica Final:** Sempre teste localmente antes de fazer deploy em produção!

---

**Última atualização:** 2024































