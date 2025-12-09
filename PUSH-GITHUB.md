# 📤 Como Fazer Push para o GitHub

## 🚀 Opção 1: Via Script (Recomendado)

Execute o script que criamos:

```bash
cd loja-eletronicos
bash push-to-github.sh
```

O script vai pedir seu nome de usuário do GitHub e fazer tudo automaticamente.

---

## 🔧 Opção 2: Manual

### **1. Adicionar Remote do GitHub**

Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub:

```bash
cd loja-eletronicos
git remote add origin https://github.com/SEU_USUARIO/smartshow.git
```

### **2. Verificar Remote**

```bash
git remote -v
```

Deve mostrar:
```
origin  https://github.com/SEU_USUARIO/smartshow.git (fetch)
origin  https://github.com/SEU_USUARIO/smartshow.git (push)
```

### **3. Fazer Push**

```bash
git push -u origin main
```

---

## ⚠️ Importante

### **Antes de fazer push, certifique-se:**

1. ✅ **Repositório criado no GitHub:**
   - Acesse: https://github.com/new
   - Nome: `smartshow`
   - Público ou Privado (sua escolha)
   - **NÃO** inicialize com README, .gitignore ou license

2. ✅ **Credenciais configuradas:**
   - Se usar HTTPS, pode pedir usuário/senha
   - Ou configure um Personal Access Token
   - Ou use SSH (mais seguro)

### **Se der erro de autenticação:**

**Opção A - Personal Access Token:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Marque: `repo` (acesso completo a repositórios)
4. Use o token como senha quando pedir

**Opção B - SSH:**
```bash
# Gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"

# Adicionar ao GitHub
# Copie a chave pública e adicione em: GitHub → Settings → SSH Keys

# Mudar remote para SSH
git remote set-url origin git@github.com:SEU_USUARIO/smartshow.git
```

---

## ✅ Após o Push

Seu repositório estará disponível em:
```
https://github.com/SEU_USUARIO/smartshow
```

---

## 🔄 Próximos Passos

Depois do push, você pode:

1. **Atualizar o Terraform** para clonar do seu repositório:
   - Edite `terraform/ec2.tf`
   - Altere a URL do git clone no user_data

2. **Configurar GitHub Actions** (opcional):
   - Para deploy automático
   - CI/CD

3. **Adicionar colaboradores** (se necessário)

---

**Precisa de ajuda?** Consulte a documentação do GitHub: https://docs.github.com
























