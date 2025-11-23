# 🚀 Como Funciona o Deploy Automático

## ✅ Resposta Rápida

**SIM!** Quando você executar `terraform apply`, tudo vai funcionar automaticamente:

1. ✅ **Aplicação sobe automaticamente** na EC2
2. ✅ **Deploy automático continua funcionando** via GitHub Actions
3. ✅ **Tudo configurado e pronto para uso**

---

## 📋 Fluxo Completo

### **1. Quando você executa `terraform apply`:**

```
terraform apply
    ↓
EC2 é criada
    ↓
user-data.sh é executado automaticamente
    ↓
┌─────────────────────────────────────────┐
│  user-data.sh faz TUDO automaticamente:│
├─────────────────────────────────────────┤
│  ✅ Atualiza sistema                    │
│  ✅ Instala Docker                      │
│  ✅ Clona repositório GitHub            │
│  ✅ Constrói containers Docker          │
│  ✅ Inicia aplicação                    │
│  ✅ Configura Nginx                     │
│  ✅ Verifica se API está funcionando    │
└─────────────────────────────────────────┘
    ↓
Aplicação está rodando! 🎉
```

### **2. Deploy Automático (GitHub Actions):**

Quando você faz **push** no GitHub:

```
git push origin main
    ↓
GitHub Actions detecta mudanças
    ↓
Workflow deploy.yml é executado
    ↓
┌─────────────────────────────────────────┐
│  Deploy automático na EC2:              │
├─────────────────────────────────────────┤
│  ✅ Busca instância EC2                │
│  ✅ Atualiza código (git pull)         │
│  ✅ Reconstrói containers              │
│  ✅ Reinicia aplicação                 │
│  ✅ Verifica se está funcionando       │
└─────────────────────────────────────────┘
    ↓
Aplicação atualizada! 🎉
```

---

## 🔍 Detalhes Técnicos

### **user-data.sh (Executado na criação da EC2)**

O script `terraform/user-data.sh` é executado **automaticamente** quando a instância EC2 é criada. Ele:

1. **Instala dependências:**
   - Docker
   - Docker Compose
   - Git
   - Nginx

2. **Clona repositório:**
   ```bash
   # Como o repositório é público, não precisa de token
   git clone https://github.com/DavidMenezess/smartshow.git
   ```

3. **Inicia aplicação:**
   ```bash
   cd /opt/smartshow/smartshow/web-site
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **Configura Nginx:**
   - Redireciona porta 80 → 3000
   - Aplicação acessível em `http://IP_PUBLICO`

5. **Verifica funcionamento:**
   - Aguarda containers iniciarem
   - Testa se API responde
   - Mostra logs e status

### **Tempo de Execução**

- **user-data.sh:** ~10-15 minutos (primeira vez)
- **Deploy automático:** ~5-10 minutos (atualizações)

### **Onde a Aplicação Fica**

```
EC2 Instance
├── /opt/smartshow/smartshow/
│   └── web-site/
│       ├── docker-compose.yml
│       ├── api/          (Backend Node.js)
│       └── src/           (Frontend HTML/CSS/JS)
└── Nginx (porta 80 → 3000)
```

---

## 🔄 Deploy Automático (GitHub Actions)

### **Quando é Executado:**

1. **Push na branch `main`:**
   - Qualquer mudança em `web-site/**`
   - Mudanças no workflow `deploy.yml`

2. **Manual:**
   - Via GitHub Actions → "Run workflow"

### **O que Faz:**

1. **Busca instância EC2:**
   - Procura por tag `Name=smartshow-prod`
   - Obtém IP público

2. **Atualiza código:**
   ```bash
   cd /opt/smartshow/smartshow
   git fetch origin
   git reset --hard origin/main
   git pull origin main
   ```

3. **Reconstrói aplicação:**
   ```bash
   cd web-site
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **Verifica funcionamento:**
   - Testa se API responde
   - Mostra status dos containers

### **Métodos de Acesso (em ordem de preferência):**

1. **AWS Systems Manager (SSM)** - Mais seguro, não precisa SSH
2. **SSH** - Fallback se SSM não estiver disponível

---

## ✅ Checklist: Tudo Funcionando?

### **Após `terraform apply`:**

- [ ] EC2 criada e rodando
- [ ] IP público disponível (mostrado no output)
- [ ] Aplicação acessível em `http://IP_PUBLICO`
- [ ] API respondendo em `http://IP_PUBLICO:3000/api/health`

### **Deploy Automático:**

- [ ] GitHub Actions configurado
- [ ] Secrets configurados (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- [ ] Workflow executa quando você faz push
- [ ] Aplicação atualiza automaticamente

---

## 🛠️ Comandos Úteis

### **Verificar se aplicação está rodando:**

```bash
# Via SSH ou SSM
cd /opt/smartshow/smartshow/web-site
docker-compose ps
docker-compose logs -f
```

### **Ver logs do user-data:**

```bash
# Na EC2
sudo cat /var/log/user-data.log
```

### **Forçar novo deploy:**

```bash
# Fazer qualquer mudança e push
git commit --allow-empty -m "Trigger deploy"
git push origin main
```

---

## 🎯 Resumo

### **Primeira Vez (`terraform apply`):**

1. ✅ Terraform cria EC2
2. ✅ user-data.sh executa automaticamente
3. ✅ Aplicação sobe e fica rodando
4. ✅ Pronto para uso!

### **Atualizações (GitHub Actions):**

1. ✅ Você faz `git push`
2. ✅ GitHub Actions detecta
3. ✅ Deploy automático atualiza EC2
4. ✅ Aplicação reinicia com novo código
5. ✅ Pronto!

---

## ⚠️ Importante

### **Repositório Público:**

Como o repositório é **público**, não precisa de token GitHub:
- ✅ `github_token = ""` (vazio)
- ✅ Clonagem funciona automaticamente
- ✅ Deploy funciona sem autenticação

### **Se o Repositório Fosse Privado:**

Você precisaria:
- Configurar `github_token` no `terraform.tfvars`
- Token com permissão `repo` no GitHub

---

## 🎉 Conclusão

**Tudo está configurado e funcionando automaticamente!**

- ✅ `terraform apply` → Aplicação sobe sozinha
- ✅ `git push` → Deploy automático atualiza
- ✅ Sem intervenção manual necessária
- ✅ Tudo documentado e testado

**Basta executar `terraform apply` e aguardar ~15 minutos!** 🚀

