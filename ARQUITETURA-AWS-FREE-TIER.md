# 🏗️ Arquitetura do Sistema - Loja de Eletrônicos e Assistência Técnica
## AWS Free Tier - Proposta Completa

---

## 📋 **Sumário Executivo**

Este documento apresenta a arquitetura completa para um sistema de gestão de loja de eletrônicos com assistência técnica, otimizado para AWS Free Tier, incluindo integração com leitor de código de barras, impressora fiscal e impressora A4.

---

## 🎯 **Requisitos do Sistema**

### **Funcionalidades Principais:**
1. ✅ Gestão de produtos (eletrônicos)
2. ✅ Controle de estoque
3. ✅ Vendas (PDV - Ponto de Venda)
4. ✅ Assistência técnica (ordens de serviço)
5. ✅ Controle financeiro (contas a pagar/receber)
6. ✅ Relatórios e dashboards
7. ✅ Integração com leitor de código de barras
8. ✅ Impressão de cupom fiscal
9. ✅ Impressão de documentos A4 (notas, relatórios)

---

## ☁️ **Arquitetura AWS Free Tier**

### **1. Infraestrutura Principal**

```
┌─────────────────────────────────────────────────────────┐
│                    AWS FREE TIER                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐            │
│  │   EC2 t2.micro│         │  S3 Bucket   │            │
│  │  (750h/mês)  │         │  (5GB grátis) │            │
│  │              │         │              │            │
│  │  - Node.js   │         │  - Imagens   │            │
│  │  - Express   │         │  - Documentos│            │
│  │  - SQLite    │         │  - Backups   │            │
│  │  - Docker    │         │              │            │
│  └──────┬───────┘         └──────────────┘            │
│         │                                                │
│         │  ┌──────────────┐                             │
│         └──│  DynamoDB   │                             │
│            │  (25GB grátis)│                            │
│            │  (opcional)  │                             │
│            └──────────────┘                             │
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │     CloudFront (CDN - Opcional)          │          │
│  │     - Cache de arquivos estáticos        │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **2. Recursos AWS Utilizados (Free Tier)**

| Serviço | Limite Free Tier | Uso no Projeto |
|---------|------------------|----------------|
| **EC2 t2.micro** | 750 horas/mês | Servidor principal da aplicação |
| **EBS Volume** | 30 GB | Armazenamento do banco SQLite e arquivos |
| **S3** | 5 GB | Armazenamento de imagens e documentos |
| **Elastic IP** | 1 IP | IP fixo para acesso |
| **Data Transfer** | 15 GB saída | Tráfego de dados |
| **DynamoDB** | 25 GB, 25 RCU, 25 WCU | Banco NoSQL (opcional) |

**Custo Total Estimado: $0.00/mês** (dentro do Free Tier)

---

## 🏛️ **Arquitetura da Aplicação**

### **Stack Tecnológica**

```
Frontend (Browser)
    │
    ├── HTML5 + CSS3 + JavaScript (Vanilla)
    ├── Web APIs (Keyboard, Print, File)
    └── PWA (Progressive Web App)
         │
         ▼
Backend (EC2)
    │
    ├── Node.js + Express
    ├── SQLite (Banco de dados principal)
    ├── DynamoDB (Opcional - para escala)
    └── Docker (Containerização)
         │
         ├── Módulos Principais:
         │   ├── API REST (/api)
         │   ├── Autenticação (JWT)
         │   ├── Gestão de Produtos
         │   ├── PDV (Ponto de Venda)
         │   ├── Assistência Técnica
         │   ├── Controle Financeiro
         │   ├── Relatórios
         │   └── Integração Hardware
         │
         └── Integrações:
             ├── Leitor Código de Barras (Web API)
             ├── Impressora Fiscal (node-escpos)
             └── Impressora A4 (PDF + Print API)
```

---

## 🔌 **Integração com Hardware**

### **1. Leitor de Código de Barras**

**Solução: Web Keyboard API**

```javascript
// O leitor de código de barras funciona como teclado USB
// Captura automática via JavaScript

document.addEventListener('keypress', (e) => {
    if (e.target.id === 'barcode-input') {
        // Leitor envia código + Enter
        // Sistema processa automaticamente
    }
});
```

**Vantagens:**
- ✅ Funciona com qualquer leitor USB padrão
- ✅ Não requer drivers especiais
- ✅ Compatível com todos os navegadores modernos
- ✅ Zero configuração adicional

---

### **2. Impressora de Cupom Fiscal**

**Solução: node-escpos + node-thermal-printer**

```javascript
// Biblioteca: node-escpos
// Suporta impressoras térmicas (Epson, Bematech, etc.)

const escpos = require('escpos');
const device = new escpos.USB(); // ou Serial/Network
const printer = new escpos.Printer(device);

// Impressão de cupom fiscal
printer
    .font('a')
    .align('ct')
    .text('CUPOM FISCAL')
    .text('---')
    .table(['Item', 'Qtd', 'Total'])
    .cut();
```

**Impressoras Suportadas:**
- ✅ Epson TM-T20, TM-T82
- ✅ Bematech MP-4200 TH
- ✅ Daruma DR-800
- ✅ Elgin i9
- ✅ Outras compatíveis ESC/POS

**Configuração:**
- USB: Conecta diretamente na EC2 ou via rede
- Serial: Via adaptador USB-Serial
- Rede: Via IP da impressora

---

### **3. Impressora A4**

**Solução: PDF Generation + Print API**

```javascript
// Geração de PDF com PDFKit
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Criar documento PDF
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('nota-venda.pdf'));

// Adicionar conteúdo
doc.fontSize(20).text('NOTA DE VENDA', { align: 'center' });
// ... mais conteúdo

doc.end();

// Enviar para impressão via API do navegador
window.print(); // ou via servidor usando CUPS (Linux)
```

**Alternativa: Puppeteer (HTML to PDF)**
```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(htmlContent);
await page.pdf({ path: 'nota.pdf', format: 'A4' });
await browser.close();
```

---

## 📁 **Estrutura do Projeto**

```
loja-eletronicos/
│
├── web-site/
│   ├── src/
│   │   ├── index.html              # Dashboard principal
│   │   ├── login.html              # Tela de login
│   │   ├── pdv.html               # Ponto de venda
│   │   ├── produtos.html           # Cadastro de produtos
│   │   ├── assistencia.html        # Ordens de serviço
│   │   ├── financeiro.html         # Controle financeiro
│   │   ├── relatorios.html         # Relatórios
│   │   └── css/
│   │       └── styles.css
│   │
│   ├── api/
│   │   ├── server.js               # Servidor Express
│   │   ├── database.js             # SQLite Database
│   │   ├── routes.js               # Rotas da API
│   │   ├── models/
│   │   │   ├── Product.js          # Modelo de produto
│   │   │   ├── Sale.js             # Modelo de venda
│   │   │   ├── ServiceOrder.js     # Ordem de serviço
│   │   │   └── Financial.js        # Financeiro
│   │   │
│   │   ├── services/
│   │   │   ├── barcode.js          # Serviço código de barras
│   │   │   ├── fiscal-printer.js   # Impressora fiscal
│   │   │   └── pdf-generator.js     # Geração de PDF
│   │   │
│   │   ├── data/
│   │   │   └── loja.db              # Banco SQLite
│   │   │
│   │   └── package.json
│   │
│   ├── config/
│   │   └── nginx.conf              # Configuração Nginx
│   │
│   ├── Dockerfile                  # Container Docker
│   └── docker-compose.yml
│
├── terraform/
│   ├── ec2.tf                      # Instância EC2
│   ├── security-groups.tf          # Security Groups
│   ├── variables.tf                # Variáveis
│   ├── provider.tf                 # Provider AWS
│   └── outputs.tf                  # Outputs
│
├── scripts/
│   ├── deploy.sh                   # Script de deploy
│   ├── setup-hardware.sh           # Configuração hardware
│   └── backup.sh                   # Backup automático
│
└── README.md
```

---

## 🗄️ **Modelo de Dados (SQLite)**

### **Tabelas Principais**

```sql
-- Produtos
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    brand TEXT,
    price REAL NOT NULL,
    cost_price REAL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    image_path TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vendas
CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    seller_id INTEGER,
    total REAL NOT NULL,
    discount REAL DEFAULT 0,
    payment_method TEXT,
    fiscal_receipt TEXT, -- Número do cupom fiscal
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Itens de Venda
CREATE TABLE sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Ordens de Serviço (Assistência Técnica)
CREATE TABLE service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    device_type TEXT,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    problem_description TEXT,
    diagnostic TEXT,
    estimated_value REAL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, delivered
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Contas a Receber
CREATE TABLE accounts_receivable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    customer_id INTEGER,
    due_date DATE NOT NULL,
    amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contas a Pagar
CREATE TABLE accounts_payable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier TEXT,
    description TEXT,
    due_date DATE NOT NULL,
    amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 **Plano de Implementação**

### **Fase 1: Infraestrutura AWS (Semana 1)**
- [ ] Configurar conta AWS
- [ ] Criar chave SSH
- [ ] Deploy Terraform (EC2, Security Groups)
- [ ] Configurar Elastic IP
- [ ] Testar conectividade

### **Fase 2: Aplicação Base (Semana 2-3)**
- [ ] Setup Node.js + Express
- [ ] Configurar SQLite
- [ ] Criar estrutura de rotas
- [ ] Implementar autenticação
- [ ] Interface básica (HTML/CSS/JS)

### **Fase 3: Módulos Core (Semana 4-5)**
- [ ] Cadastro de produtos
- [ ] Controle de estoque
- [ ] PDV (Ponto de Venda)
- [ ] Integração leitor código de barras

### **Fase 4: Integração Hardware (Semana 6)**
- [ ] Configurar impressora fiscal
- [ ] Implementar impressão cupom
- [ ] Configurar impressora A4
- [ ] Geração de PDFs

### **Fase 5: Módulos Avançados (Semana 7-8)**
- [ ] Assistência técnica (OS)
- [ ] Controle financeiro
- [ ] Relatórios e dashboards
- [ ] Backup automático

### **Fase 6: Testes e Deploy (Semana 9-10)**
- [ ] Testes de integração
- [ ] Testes de hardware
- [ ] Otimizações
- [ ] Documentação final
- [ ] Deploy produção

---

## 💰 **Estimativa de Custos**

### **Free Tier (Primeiro Ano)**
- **EC2 t2.micro**: $0.00 (750h/mês)
- **EBS 20GB**: $0.00 (30GB grátis)
- **S3 5GB**: $0.00 (5GB grátis)
- **Elastic IP**: $0.00 (1 IP grátis)
- **Data Transfer**: $0.00 (15GB grátis)

**Total: $0.00/mês** ✅

### **Após Free Tier (Se necessário)**
- **EC2 t2.micro**: ~$8.50/mês (se usar mais de 750h)
- **EBS 20GB**: ~$2.00/mês
- **S3 5GB**: ~$0.12/mês
- **Elastic IP**: $0.00 (se anexado à instância)

**Total estimado: ~$10-15/mês** (após free tier)

---

## 🔒 **Segurança**

### **Medidas Implementadas:**
1. ✅ Security Groups restritivos
2. ✅ Autenticação JWT
3. ✅ HTTPS (via Let's Encrypt - grátis)
4. ✅ Backup automático para S3
5. ✅ Validação de inputs
6. ✅ SQL Injection protection (prepared statements)

---

## 📊 **Monitoramento**

### **Ferramentas Grátis:**
- **CloudWatch Basic**: Grátis (métricas básicas)
- **Health Checks**: Endpoint `/api/health`
- **Logs**: Armazenados localmente e enviados para S3

---

## 🎯 **Próximos Passos**

1. **Revisar esta arquitetura**
2. **Criar estrutura inicial do projeto**
3. **Configurar ambiente AWS**
4. **Iniciar desenvolvimento**

---

## 📝 **Notas Importantes**

### **Limitações do Free Tier:**
- EC2 t2.micro tem apenas 1 vCPU e 1GB RAM
- Pode ser lento com muitas requisições simultâneas
- Recomendado para até 5-10 usuários simultâneos

### **Recomendações:**
- Use SQLite para começar (mais simples)
- Migre para DynamoDB se precisar de escala
- Faça backups regulares para S3
- Monitore uso de recursos

---

**Documento criado em:** 2024
**Versão:** 1.0.0
**Autor:** Sistema de Gestão Loja Eletrônicos











