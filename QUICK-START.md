# 🚀 Guia Rápido de Início

## ⚡ Início Rápido (5 minutos)

### **1. Pré-requisitos**
- Conta AWS (Free Tier)
- Terraform instalado
- Chave SSH criada na AWS
- Node.js 18+ (para desenvolvimento local)

### **2. Configurar Terraform**

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edite `terraform.tfvars`:
```hcl
aws_region      = "us-east-1"
key_name        = "sua-chave-ssh"
your_ip         = "SEU_IP/32"  # Use: curl ifconfig.me
```

### **3. Deploy na AWS**

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### **4. Acessar Sistema**

Após o deploy, você receberá:
- **IP Público**: Mostrado no output do Terraform
- **Dashboard**: `http://<IP_PUBLICO>`
- **API**: `http://<IP_PUBLICO>:3000`

### **5. Login Inicial**

- **Usuário**: `admin`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

---

## 🔧 Desenvolvimento Local

### **Instalar Dependências**

```bash
cd web-site/api
npm install
```

### **Configurar Ambiente**

```bash
cp .env.example .env
# Editar .env conforme necessário
```

### **Iniciar Servidor**

```bash
npm start
```

Acesse: `http://localhost:3000`

---

## 🔌 Configurar Hardware

### **Leitor de Código de Barras**
- Conecte via USB
- Funciona automaticamente (não precisa configuração)

### **Impressora Fiscal**
1. Conecte via USB ou rede
2. Descubra Vendor ID e Product ID:
   ```bash
   lsusb  # Linux
   ```
3. Configure em `.env`:
   ```
   FISCAL_PRINTER_TYPE=usb
   FISCAL_PRINTER_VENDOR_ID=0x04f9
   FISCAL_PRINTER_PRODUCT_ID=0x20e8
   ```

### **Impressora A4**
1. Conecte via USB ou rede
2. Configure CUPS:
   ```bash
   sudo apt-get install cups
   sudo cupsctl --remote-any
   ```
3. Acesse: `http://localhost:631`

---

## 📊 Estrutura de Dados

### **Usuários Padrão**
- `admin` / `admin123` - Administrador
- `vendedor` / `vendedor123` - Vendedor
- `caixa` / `caixa123` - Caixa
- `tecnico` / `tecnico123` - Técnico

### **Banco de Dados**
- Localização: `web-site/api/data/loja.db`
- Tipo: SQLite
- Backup: Execute `./scripts/backup.sh`

---

## 🛠️ Comandos Úteis

### **Docker (Produção)**
```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Atualizar
docker-compose pull && docker-compose up -d
```

### **Backup**
```bash
./scripts/backup.sh
```

### **Atualizar Aplicação**
```bash
./scripts/update.sh
```

---

## ❓ Problemas Comuns

### **Erro ao conectar impressora**
- Verifique se o dispositivo está conectado
- Confirme Vendor ID e Product ID
- Teste com: `node api/scripts/test-printer.js`

### **Banco de dados não encontrado**
- O banco é criado automaticamente na primeira execução
- Verifique permissões do diretório `data/`

### **Erro 500 na API**
- Verifique logs: `docker-compose logs api`
- Confirme que o banco de dados existe
- Verifique variáveis de ambiente

---

## 📞 Suporte

Para mais informações, consulte:
- `ARQUITETURA-AWS-FREE-TIER.md` - Arquitetura completa
- `IMPLEMENTACAO-HARDWARE.md` - Guia de hardware
- `ESTRUTURA-PROJETO.md` - Estrutura do projeto

---

**Boa sorte com seu sistema! 🎉**































