# 📁 Estrutura do Projeto - Loja de Eletrônicos

## 📂 Estrutura de Diretórios

```
loja-eletronicos/
│
├── 📄 README.md                          # Documentação principal
├── 📄 ARQUITETURA-AWS-FREE-TIER.md      # Arquitetura detalhada
├── 📄 MELHOR-FORMA-IMPLEMENTACAO.md     # Análise comparativa
├── 📄 IMPLEMENTACAO-HARDWARE.md         # Guia de hardware
│
├── 📁 web-site/                          # Aplicação principal
│   ├── 📁 src/                          # Frontend
│   │   ├── 📄 index.html                # Dashboard
│   │   ├── 📄 login.html                # Tela de login
│   │   ├── 📄 pdv.html                  # Ponto de venda
│   │   ├── 📄 produtos.html             # Cadastro produtos
│   │   ├── 📄 clientes.html             # Cadastro clientes
│   │   ├── 📄 assistencia.html          # Ordens de serviço
│   │   ├── 📄 financeiro.html           # Controle financeiro
│   │   ├── 📄 relatorios.html           # Relatórios
│   │   │
│   │   ├── 📁 css/
│   │   │   └── 📄 styles.css            # Estilos
│   │   │
│   │   └── 📁 js/
│   │       ├── 📄 api.js                # Cliente API
│   │       ├── 📄 auth.js                # Autenticação
│   │       ├── 📄 barcode-reader.js      # Leitor código barras
│   │       ├── 📄 pdv.js                 # Lógica PDV
│   │       └── 📄 dashboard.js           # Dashboard
│   │
│   ├── 📁 api/                          # Backend
│   │   ├── 📄 server.js                  # Servidor Express
│   │   ├── 📄 database.js                # SQLite Database
│   │   ├── 📄 config.js                  # Configurações
│   │   ├── 📄 package.json               # Dependências
│   │   │
│   │   ├── 📁 routes/                    # Rotas da API
│   │   │   ├── 📄 index.js               # Rotas principais
│   │   │   ├── 📄 auth.js                # Autenticação
│   │   │   ├── 📄 products.js            # Produtos
│   │   │   ├── 📄 sales.js               # Vendas
│   │   │   ├── 📄 customers.js            # Clientes
│   │   │   ├── 📄 serviceOrders.js       # Ordens serviço
│   │   │   ├── 📄 financial.js            # Financeiro
│   │   │   ├── 📄 reports.js             # Relatórios
│   │   │   └── 📄 print.js                # Impressão
│   │   │
│   │   ├── 📁 services/                  # Serviços
│   │   │   ├── 📄 fiscalPrinter.js       # Impressora fiscal
│   │   │   └── 📄 pdfGenerator.js        # Geração PDF
│   │   │
│   │   ├── 📁 data/                      # Banco de dados
│   │   │   └── 📄 loja.db                # SQLite (gerado)
│   │   │
│   │   └── 📁 output/                     # PDFs gerados
│   │
│   ├── 📄 Dockerfile                     # Container Docker
│   ├── 📄 docker-compose.yml             # Compose
│   └── 📄 .env.example                   # Exemplo env
│
├── 📁 terraform/                         # Infraestrutura AWS
│   ├── 📄 provider.tf                    # Provider AWS
│   ├── 📄 variables.tf                  # Variáveis
│   ├── 📄 ec2.tf                         # Instância EC2
│   ├── 📄 security-groups.tf            # Security Groups
│   ├── 📄 outputs.tf                     # Outputs
│   └── 📄 terraform.tfvars.example       # Exemplo vars
│
└── 📁 scripts/                           # Scripts utilitários
    ├── 📄 deploy.sh                      # Deploy AWS
    ├── 📄 setup-hardware.sh              # Config hardware
    ├── 📄 backup.sh                      # Backup
    └── 📄 update.sh                      # Atualização
```

## 🎯 Componentes Principais

### **Frontend (src/)**
- HTML/CSS/JavaScript puro
- Sem frameworks (leve e rápido)
- Responsivo
- Integração com leitor de código de barras

### **Backend (api/)**
- Node.js + Express
- SQLite (banco de dados)
- REST API
- Integração com impressoras

### **Infraestrutura (terraform/)**
- Terraform para AWS
- EC2 t2.micro (Free Tier)
- Security Groups configurados
- Elastic IP

### **Scripts (scripts/)**
- Deploy automatizado
- Backup automático
- Configuração de hardware
- Atualização da aplicação

## 🚀 Como Usar

1. **Configurar variáveis do Terraform:**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Editar terraform.tfvars
   ```

2. **Deploy:**
   ```bash
   ./scripts/deploy.sh
   ```

3. **Acessar:**
   - Dashboard: `http://<IP_PUBLICO>`
   - API: `http://<IP_PUBLICO>:3000`

## 📝 Notas

- Banco de dados SQLite é criado automaticamente
- Usuários padrão são criados na primeira execução
- Backups devem ser configurados manualmente
- Hardware precisa ser configurado após deploy































