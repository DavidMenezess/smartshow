# 🔒 Segurança em Repositório Público

## ✅ SIM, você pode deixar público e proteger informações sensíveis!

Este guia mostra como proteger suas informações sensíveis mesmo com o repositório público.

## 🛡️ O que JÁ está protegido

### ✅ Arquivos no `.gitignore` (NÃO vão para o GitHub):

- ✅ `terraform/terraform.tfvars` - Suas configurações sensíveis
- ✅ `*.pem` - Chaves SSH
- ✅ `*.key` - Chaves privadas
- ✅ `terraform/*.tfstate` - Estado do Terraform (pode conter IDs de recursos)
- ✅ `terraform/*.tfstate.backup` - Backups do estado

### ✅ Informações que NÃO devem estar no código:

- ❌ Credenciais AWS (Access Key, Secret Key)
- ❌ Tokens GitHub
- ❌ Senhas
- ❌ Chaves SSH privadas (.pem)
- ❌ IPs pessoais (se quiser manter privado)
- ❌ Tokens de API

## 🔐 Como Proteger Informações Sensíveis

### **1. Usar GitHub Secrets (Para GitHub Actions)**

Para workflows do GitHub Actions, use **Secrets**:

1. **GitHub → Repositório → Settings → Secrets and variables → Actions**
2. **New repository secret**
3. Adicione:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `EC2_SSH_PRIVATE_KEY`
   - `GITHUB_TOKEN` (se necessário)

**No workflow, use assim:**
```yaml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### **2. Usar Variáveis de Ambiente Locais**

Para desenvolvimento local, use arquivo `.env` (já no .gitignore):

```bash
# Criar arquivo .env (não vai para o Git)
AWS_ACCESS_KEY_ID=sua_chave
AWS_SECRET_ACCESS_KEY=sua_secret
```

### **3. Usar Terraform Variables (terraform.tfvars)**

O arquivo `terraform.tfvars` **JÁ está no .gitignore**, então está protegido:

```hcl
# terraform.tfvars (NÃO vai para o GitHub)
github_token = "seu_token_aqui"
your_ip = "seu_ip_aqui"
```

**Crie um arquivo de exemplo (pode ir para o Git):**
```hcl
# terraform.tfvars.example (PODE ir para o GitHub)
github_token = ""  # Cole seu token aqui
your_ip = "0.0.0.0/32"  # Cole seu IP aqui
```

### **4. Verificar se Nada Sensível Está no Código**

**Antes de fazer commit, verifique:**

```bash
# Buscar possíveis credenciais no código
git grep -i "password\|secret\|key\|token" -- "*.js" "*.ts" "*.py" "*.tf" "*.yml" "*.yaml"

# Verificar arquivos que vão ser commitados
git status
git diff --cached
```

## 📋 Checklist de Segurança

### **Antes de Tornar Público:**

- [ ] Verificar que `terraform.tfvars` está no `.gitignore`
- [ ] Verificar que não há `.pem` ou `.key` no repositório
- [ ] Verificar que não há credenciais hardcoded no código
- [ ] Verificar que não há tokens em arquivos de configuração
- [ ] Verificar histórico do Git (se já commitou algo sensível antes)

### **Se Já Commitou Algo Sensível Antes:**

⚠️ **IMPORTANTE:** Se você já commitou informações sensíveis antes, elas estão no histórico do Git!

**Soluções:**

1. **Rotacionar credenciais:**
   - Gerar novas chaves AWS
   - Gerar novo token GitHub
   - Invalidar os antigos

2. **Limpar histórico (se necessário):**
   ```bash
   # Usar git-filter-repo ou BFG Repo-Cleaner
   # CUIDADO: Isso reescreve o histórico!
   ```

3. **Melhor: Rotacionar e seguir em frente:**
   - Invalidar credenciais antigas
   - Usar novas credenciais
   - O histórico antigo não é acessível facilmente

## 🔍 O que PODE Ficar Público (Seguro)

### ✅ Informações que são SEGURAS para público:

- ✅ Código da aplicação
- ✅ Estrutura de arquivos
- ✅ Configurações do Terraform (sem valores sensíveis)
- ✅ Dockerfiles
- ✅ Scripts de build
- ✅ Documentação
- ✅ Nomes de recursos AWS (sem IDs reais)
- ✅ Estrutura do banco de dados (sem dados)

### ⚠️ Informações que DEVEM ser privadas:

- ❌ Credenciais AWS (Access Key, Secret Key)
- ❌ Tokens de API
- ❌ Senhas
- ❌ Chaves SSH privadas
- ❌ Estado do Terraform (tfstate) - contém IDs de recursos
- ❌ IPs pessoais (se quiser manter privado)
- ❌ Configurações específicas do ambiente

## 🛠️ Boas Práticas

### **1. Usar Arquivo de Exemplo**

Crie `terraform.tfvars.example` (pode ir para o Git):

```hcl
# terraform.tfvars.example
aws_region = "sa-east-1"
key_name = "sua-chave"
your_ip = "0.0.0.0/32"
github_token = ""  # Cole seu token aqui
github_repo = "https://github.com/usuario/repositorio.git"
```

### **2. Usar Variáveis de Ambiente**

No código, use variáveis de ambiente:

```javascript
// ❌ ERRADO (hardcoded)
const apiKey = "abc123";

// ✅ CORRETO (variável de ambiente)
const apiKey = process.env.API_KEY;
```

### **3. Validar .gitignore**

Sempre verifique o `.gitignore` antes de commits importantes:

```bash
# Verificar se arquivo sensível está sendo ignorado
git check-ignore terraform/terraform.tfvars
# Deve retornar: terraform/terraform.tfvars
```

### **4. Usar GitHub Secrets para CI/CD**

Nunca coloque credenciais diretamente nos workflows:

```yaml
# ❌ ERRADO
env:
  AWS_KEY: "AKIAIOSFODNN7EXAMPLE"

# ✅ CORRETO
env:
  AWS_KEY: ${{ secrets.AWS_ACCESS_KEY_ID }}
```

## 📝 Exemplo: Configuração Segura

### **Estrutura de Arquivos:**

```
projeto/
├── .gitignore              # Protege arquivos sensíveis
├── terraform/
│   ├── terraform.tfvars    # ⚠️ NÃO vai para Git (sensível)
│   ├── terraform.tfvars.example  # ✅ PODE ir para Git (exemplo)
│   ├── *.tf                # ✅ PODE ir para Git (código)
│   └── *.pem               # ⚠️ NÃO vai para Git (chave SSH)
├── .env                    # ⚠️ NÃO vai para Git (variáveis locais)
└── .env.example            # ✅ PODE ir para Git (exemplo)
```

## 🚨 Se Algo Sensível Vazar

### **Ações Imediatas:**

1. **Rotacionar credenciais:**
   - AWS: Gerar novas Access Keys
   - GitHub: Revogar token e gerar novo
   - Outros serviços: Revogar tokens

2. **Remover do histórico (se necessário):**
   - Usar `git-filter-repo` ou `BFG Repo-Cleaner`
   - Ou criar novo repositório limpo

3. **Verificar logs de acesso:**
   - AWS CloudTrail
   - GitHub Security log

## ✅ Resumo

**SIM, você pode deixar público com segurança:**

1. ✅ Use `.gitignore` para proteger arquivos sensíveis
2. ✅ Use GitHub Secrets para CI/CD
3. ✅ Use variáveis de ambiente no código
4. ✅ Use `terraform.tfvars` (já protegido)
5. ✅ Crie arquivos `.example` para documentação
6. ✅ Rotacione credenciais se algo vazar

**Seu repositório pode ser público e seguro!** 🎉




























