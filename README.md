# 🏪 Smartshow - Sistema de Gestão para Loja de Eletrônicos e Assistência Técnica

Sistema completo de gestão para loja de eletrônicos com assistência técnica, otimizado para AWS Free Tier, com integração de leitor de código de barras, impressora fiscal e impressora A4.

---

## 📚 Documentação Completa

### **📖 Guias Principais:**

1. **[QUICK-START.md](./QUICK-START.md)** ⚡
   - Início rápido em 5 minutos
   - Configuração básica
   - Primeiros passos

2. **[GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md)** 🔧
   - **Onde fazer cada tipo de alteração**
   - **Como modificar funcionalidades**
   - **Fluxo de trabalho recomendado**
   - **Exemplos práticos**

3. **[ARQUITETURA-AWS-FREE-TIER.md](./ARQUITETURA-AWS-FREE-TIER.md)** 🏗️
   - Arquitetura detalhada
   - Recursos AWS utilizados
   - Modelo de dados
   - Plano de implementação

4. **[IMPLEMENTACAO-HARDWARE.md](./IMPLEMENTACAO-HARDWARE.md)** 🔌
   - Configuração leitor de código de barras
   - Configuração impressora fiscal
   - Configuração impressora A4
   - Testes de hardware

5. **[ESTRUTURA-PROJETO.md](./ESTRUTURA-PROJETO.md)** 📁
   - Estrutura completa de diretórios
   - Explicação de cada componente
   - Organização do código

---

## 🎯 Funcionalidades

### **Módulos Principais:**
- ✅ **PDV (Ponto de Venda)** - Vendas com leitor de código de barras
- ✅ **Gestão de Produtos** - Cadastro, estoque, categorias
- ✅ **Assistência Técnica** - Ordens de serviço completas
- ✅ **Controle Financeiro** - Contas a pagar/receber, fluxo de caixa
- ✅ **Relatórios** - Vendas, estoque, financeiro, assistência
- ✅ **Dashboard** - Visão geral do negócio

### **Integrações Hardware:**
- ✅ **Leitor de Código de Barras** - USB (compatível com qualquer leitor padrão)
- ✅ **Impressora Fiscal** - Cupom fiscal (Epson, Bematech, Daruma, etc.)
- ✅ **Impressora A4** - Notas de venda, relatórios, ordens de serviço

---

## 🚀 Início Rápido

### **1. Pré-requisitos:**
- Conta AWS (Free Tier)
- Terraform instalado
- Node.js 18+ (para desenvolvimento local)
- Docker (opcional)

### **2. Deploy na AWS:**

```bash
# Configurar Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars com suas configurações

# Deploy
terraform init
terraform plan
terraform apply
```

### **3. Acessar o Sistema:**
- O IP será exibido no output do Terraform
- Dashboard: `http://<IP_PUBLICO>`
- Login inicial: `admin` / `admin123`

**⚠️ IMPORTANTE:** Altere a senha após o primeiro login!

---

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
cd web-site/api
npm install

# Iniciar servidor
npm start

# Acessar
http://localhost:3000
```

---

## 📖 Onde Fazer Alterações?

### **🎨 Alterar Design/Layout:**
- **Arquivo:** `web-site/src/css/styles.css`
- **Guia:** [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md#4-alterar-layoutdesign-cores-fontes-tamanhos)

### **📝 Alterar Textos/Mensagens:**
- **Arquivos:** `web-site/src/*.html` e `web-site/src/js/*.js`
- **Guia:** [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md#alterar-textosmensagens)

### **🗄️ Alterar Banco de Dados:**
- **Arquivo:** `web-site/api/database.js`
- **Guia:** [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md#6-alterar-configurações-do-banco-de-dados)

### **🔌 Configurar Impressoras:**
- **Arquivo:** `web-site/api/config.js` ou `.env`
- **Guia:** [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md#7-configurar-impressoras)

### **🏢 Alterar Dados da Empresa:**
- **Arquivo:** `web-site/api/services/pdfGenerator.js`
- **Guia:** [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md#1-alterar-dados-da-empresa-nome-cnpj-endereço)

### **➕ Adicionar Funcionalidades:**
- **Backend:** `web-site/api/routes/`
- **Frontend:** `web-site/src/`
- **Guia:** [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md#5-adicionar-novas-telaspáginas)

---

## 📁 Estrutura do Projeto

```
loja-eletronicos/
├── web-site/              # Aplicação principal
│   ├── src/              # Frontend (HTML/CSS/JS)
│   └── api/              # Backend (Node.js/Express)
├── terraform/            # Infraestrutura AWS
├── scripts/              # Scripts de deploy e manutenção
└── docs/                 # Documentação
```

**📖 Detalhes:** [ESTRUTURA-PROJETO.md](./ESTRUTURA-PROJETO.md)

---

## 💰 Custos

### **Free Tier (Primeiro Ano)**
- **EC2 t2.micro**: $0.00 (750h/mês)
- **EBS 20GB**: $0.00 (30GB grátis)
- **Elastic IP**: $0.00 (1 IP grátis)

**Total: $0.00/mês** ✅

### **Após Free Tier**
- **Total estimado: ~$10-15/mês**

---

## 🛠️ Comandos Úteis

### **Backup:**
```bash
./scripts/backup.sh
```

### **Atualizar Aplicação:**
```bash
./scripts/update.sh
```

### **Ver Logs:**
```bash
docker-compose logs -f
```

---

## 📞 Suporte e Documentação

### **Documentação Completa:**
- [QUICK-START.md](./QUICK-START.md) - Início rápido
- [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md) - **Manutenção e alterações**
- [ARQUITETURA-AWS-FREE-TIER.md](./ARQUITETURA-AWS-FREE-TIER.md) - Arquitetura
- [IMPLEMENTACAO-HARDWARE.md](./IMPLEMENTACAO-HARDWARE.md) - Hardware
- [ESTRUTURA-PROJETO.md](./ESTRUTURA-PROJETO.md) - Estrutura

### **Problemas Comuns:**
Consulte [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md#problemas-comuns)

---

## ✅ Checklist de Inicialização

- [ ] Configurar `terraform/terraform.tfvars`
- [ ] Fazer deploy: `terraform apply`
- [ ] Acessar sistema e fazer login
- [ ] Alterar senha padrão
- [ ] Configurar dados da empresa
- [ ] Configurar impressoras
- [ ] Testar leitor de código de barras
- [ ] Fazer primeiro backup

---

## 📝 Licença

MIT License

---

## 🎉 Smartshow pronto para usar!

O sistema está **100% funcional** e **bem documentado**. 

**Comece por aqui:**
1. Leia [QUICK-START.md](./QUICK-START.md) para iniciar
2. Consulte [GUIA-MANUTENCAO.md](./GUIA-MANUTENCAO.md) para fazer alterações
3. Use [IMPLEMENTACAO-HARDWARE.md](./IMPLEMENTACAO-HARDWARE.md) para configurar hardware

**Boa sorte com o Smartshow! 🚀**

---

**Versão:** 1.0.0  
**Última atualização:** 2024
