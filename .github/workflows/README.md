# 🔄 GitHub Actions - Workflows CI/CD

Este diretório contém os workflows de CI/CD para o projeto Smartshow.

## 📋 Workflows Disponíveis

### **1. CI - Continuous Integration** (`ci.yml`)
**Quando executa:**
- Push para `main` ou `develop`
- Pull Requests para `main` ou `develop`

**O que faz:**
- ✅ Valida Terraform
- ✅ Valida Backend (Node.js)
- ✅ Valida Frontend (HTML/CSS/JS)
- ✅ Valida Scripts Shell
- ✅ Scan de Segurança

---

### **2. Terraform Plan** (`terraform-plan.yml`)
**Quando executa:**
- Push para `main` (apenas mudanças em `terraform/`)
- Pull Requests para `main` (apenas mudanças em `terraform/`)

**O que faz:**
- ✅ Valida configuração Terraform
- ✅ Executa `terraform plan`
- ✅ Comenta no PR com o resultado do plan

---

### **3. Terraform Apply** (`terraform-apply.yml`)
**Quando executa:**
- Manualmente via `workflow_dispatch`
- Push de tags `v*` (ex: `v1.0.0`)

**O que faz:**
- ✅ Aplica mudanças na infraestrutura AWS
- ✅ Cria/atualiza recursos EC2
- ✅ Gera outputs (IP, URLs)

**⚠️ Requer Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

### **4. Test Backend** (`test-backend.yml`)
**Quando executa:**
- Push para `main` ou `develop` (apenas mudanças em `web-site/api/`)
- Pull Requests (apenas mudanças em `web-site/api/`)

**O que faz:**
- ✅ Verifica sintaxe JavaScript
- ✅ Valida estrutura de arquivos
- ✅ Verifica dependências

---

### **5. Lint e Formatação** (`lint.yml`)
**Quando executa:**
- Push para `main` ou `develop`
- Pull Requests

**O que faz:**
- ✅ Formata código Terraform
- ✅ Lint JavaScript (se configurado)
- ✅ Lint Markdown

---

### **6. Deploy Application** (`deploy.yml`)
**Quando executa:**
- Manualmente via `workflow_dispatch`
- Push de tags `v*`

**O que faz:**
- ✅ Conecta na EC2 via SSH
- ✅ Atualiza código (`git pull`)
- ✅ Reconstrói containers Docker
- ✅ Health check da aplicação

**⚠️ Requer Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EC2_SSH_KEY` (chave privada SSH)

---

### **7. Security Scan** (`security-scan.yml`)
**Quando executa:**
- Push para `main` ou `develop`
- Pull Requests
- Semanalmente (domingos)

**O que faz:**
- ✅ Scan de vulnerabilidades npm
- ✅ Verifica secrets expostos (TruffleHog)
- ✅ Scan de dependências (Snyk - opcional)

---

### **8. Dependency Review** (`dependency-review.yml`)
**Quando executa:**
- Pull Requests

**O que faz:**
- ✅ Revisa dependências adicionadas/modificadas
- ✅ Alerta sobre vulnerabilidades conhecidas

---

### **9. Cleanup** (`cleanup.yml`)
**Quando executa:**
- Semanalmente (domingos às 2h)
- Manualmente via `workflow_dispatch`

**O que faz:**
- ✅ Remove artifacts antigos
- ✅ Limpa espaço de armazenamento

---

## 🔐 Secrets Necessários

Configure os seguintes secrets no GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

### **Obrigatórios para Deploy:**
- `AWS_ACCESS_KEY_ID` - Access Key da AWS
- `AWS_SECRET_ACCESS_KEY` - Secret Key da AWS
- `EC2_SSH_KEY` - Chave privada SSH para acesso à EC2

### **Opcionais:**
- `SNYK_TOKEN` - Token do Snyk (para scan avançado)

---

## 🚀 Como Usar

### **Deploy Manual:**
1. Vá em **Actions** no GitHub
2. Selecione **Terraform Apply** ou **Deploy Application**
3. Clique em **Run workflow**
4. Escolha o ambiente
5. Clique em **Run workflow**

### **Deploy Automático:**
- Crie uma tag: `git tag v1.0.0 && git push origin v1.0.0`
- O workflow será executado automaticamente

---

## 📊 Status dos Workflows

Você pode ver o status dos workflows:
- Na aba **Actions** do GitHub
- No badge no README (se configurado)
- Via API do GitHub

---

## 🔧 Customização

Para customizar os workflows:
1. Edite os arquivos `.yml` neste diretório
2. Ajuste triggers, jobs e steps conforme necessário
3. Commit e push - os workflows serão atualizados automaticamente

---

## 📝 Notas

- Workflows são executados em runners do GitHub (ubuntu-latest)
- Cada workflow pode ter múltiplos jobs
- Jobs podem rodar em paralelo ou sequencialmente
- Use `needs:` para definir dependências entre jobs

---

**Última atualização:** 2024






























