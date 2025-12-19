# 📤 Como Fazer Push para o GitHub (Windows)

## 🚀 Passo a Passo

### **1. Certifique-se que o repositório existe no GitHub**

1. Acesse: https://github.com/new
2. Nome do repositório: `smartshow`
3. Escolha Público ou Privado
4. **NÃO marque** "Add a README file" ou outras opções
5. Clique em "Create repository"

---

### **2. No PowerShell, execute os comandos:**

Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub:

```powershell
# Ir para o diretório do projeto
cd C:\Users\User\Documents\Estudo\loja-eletronicos

# Adicionar remote do GitHub
git remote add origin https://github.com/SEU_USUARIO/smartshow.git

# Verificar se foi adicionado
git remote -v

# Fazer push
git push -u origin main
```

---

### **3. Se pedir autenticação:**

**Opção A - Personal Access Token (Recomendado):**

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Nome: `smartshow-push`
4. Marque: `repo` (acesso completo)
5. Generate token
6. **Copie o token** (você não verá novamente!)
7. Quando pedir senha, cole o token

**Opção B - Usuário e Senha:**
- Usuário: seu nome de usuário do GitHub
- Senha: seu Personal Access Token (não funciona mais com senha normal)

---

### **4. Verificar se funcionou:**

Acesse: `https://github.com/SEU_USUARIO/smartshow`

Você deve ver todos os arquivos do projeto!

---

## 🔄 Comandos Completos (Copie e Cole)

```powershell
cd C:\Users\User\Documents\Estudo\loja-eletronicos
git remote add origin https://github.com/SEU_USUARIO/smartshow.git
git push -u origin main
```

**Substitua `SEU_USUARIO` pelo seu nome de usuário!**

---

## ⚠️ Problemas Comuns

### **"remote origin already exists"**
```powershell
git remote remove origin
git remote add origin https://github.com/SEU_USUARIO/smartshow.git
```

### **"Authentication failed"**
- Use Personal Access Token em vez de senha
- Verifique se o token tem permissão `repo`

### **"Repository not found"**
- Verifique se o repositório existe no GitHub
- Verifique se o nome de usuário está correto
- Verifique se você tem permissão de escrita

---

## ✅ Pronto!

Após o push, seu código estará no GitHub e você pode:
- Compartilhar com outros desenvolvedores
- Fazer deploy automático
- Versionar seu código
- Usar no Terraform (atualizar URL no ec2.tf)

---

**Dúvidas?** Consulte: https://docs.github.com/pt/get-started






























