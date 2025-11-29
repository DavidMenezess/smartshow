# 📦 Como Criar o Novo Repositório no GitHub

## ❌ Erro: "Repository not found"

O repositório `https://github.com/Katrashi/smartshow.git` ainda não existe no GitHub.

## ✅ Solução: Criar o Repositório

### **Opção 1: Criar via Interface Web (Recomendado)**

1. **Acesse:** https://github.com/new
2. **Preencha:**
   - **Repository name:** `smartshow`
   - **Description:** (opcional) Sistema de gestão de loja de eletrônicos
   - **Visibility:** 
     - ✅ **Public** (recomendado - GitHub Actions ilimitado)
     - ⚠️ **Private** (se precisar manter privado)
3. **NÃO marque:**
   - ❌ "Add a README file"
   - ❌ "Add .gitignore"
   - ❌ "Choose a license"
4. **Clique:** "Create repository"

### **Opção 2: Criar via GitHub CLI (se tiver instalado)**

```bash
gh repo create Katrashi/smartshow --public --source=. --remote=novo --push
```

## 🚀 Após Criar o Repositório

### **1. Fazer Push do Código**

```bash
cd C:\Users\User\Documents\Estudo\loja-eletronicos

# Alterar remote para novo repositório
git remote set-url origin https://github.com/Katrashi/smartshow.git

# Verificar
git remote -v

# Fazer push
git push -u origin main
```

### **2. Se o Repositório for Privado**

Se você criou como privado, pode precisar autenticar:

```bash
# Opção A: Usar token no URL
git remote set-url origin https://SEU_TOKEN@github.com/Katrashi/smartshow.git

# Opção B: Usar GitHub CLI
gh auth login
git push -u origin main

# Opção C: Configurar credenciais
git config --global credential.helper wincred
# Na primeira vez, o Windows pedirá usuário e senha/token
```

### **3. Verificar Push**

Após o push, verifique:
- Acesse: https://github.com/Katrashi/smartshow
- Deve ver todos os arquivos do projeto

## 📝 Checklist

- [ ] Repositório criado no GitHub (Katrashi/smartshow)
- [ ] Remote alterado para novo repositório
- [ ] Push realizado com sucesso
- [ ] Código visível no GitHub
- [ ] Se privado: token configurado no terraform.tfvars

## ⚠️ Importante

- Se o repositório for **público**: não precisa de token no `terraform.tfvars`
- Se o repositório for **privado**: precisa do token no `terraform.tfvars`
- O token precisa ter permissão `repo` para repositórios privados

## 🔄 Próximos Passos

Após criar o repositório e fazer push:

1. ✅ Verificar que o código está no GitHub
2. ✅ Recriar instância EC2 com `terraform apply`
3. ✅ A instância vai clonar automaticamente do novo repositório











