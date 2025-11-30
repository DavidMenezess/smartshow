# ✅ Checklist: Mudança de Repositório GitHub

## 📋 O que você já alterou:

- ✅ `terraform.tfvars` - `github_token` e `github_repo`

## 📋 O que foi atualizado automaticamente:

- ✅ `terraform/configurar-ec2-manual.sh` - Referência ao repositório
- ✅ `terraform/executar-user-data.sh` - Valor padrão do repositório
- ✅ `terraform/variables.tf` - Valor padrão do repositório
- ✅ `terraform/verificar-instancia.sh` - Referência ao repositório

## ⚠️ O que você PRECISA fazer manualmente:

### 1. **GitHub Actions Secrets** (Se estiver usando deploy automático)

Se você usa o workflow de deploy (`deploy.yml`), precisa atualizar os secrets na **nova conta GitHub**:

1. Acesse: **Nova conta GitHub → Repositório → Settings → Secrets and variables → Actions**
2. Configure os seguintes secrets:
   - `AWS_ACCESS_KEY_ID` - Sua chave de acesso AWS
   - `AWS_SECRET_ACCESS_KEY` - Sua chave secreta AWS
   - `EC2_SSH_PRIVATE_KEY` - Chave SSH da EC2 (se usar SSH para deploy)

### 2. **Verificar se o repositório existe na nova conta**

Certifique-se de que:
- ✅ O repositório `https://github.com/Katrashi/smartshow.git` existe
- ✅ O token GitHub tem permissões para acessar o repositório
- ✅ Se o repositório for privado, o token tem permissão `repo`

### 3. **Fazer push do código para o novo repositório**

Se ainda não fez:

```bash
# Adicionar novo remote
git remote add novo-origin https://github.com/Katrashi/smartshow.git

# Ou alterar o remote existente
git remote set-url origin https://github.com/Katrashi/smartshow.git

# Fazer push
git push -u origin main
```

### 4. **Recriar a instância EC2 (se já existir)**

Se você já tem uma instância EC2 rodando:

**Opção A: Recriar via Terraform (Recomendado)**
```bash
cd terraform
terraform destroy  # Remove instância antiga
terraform apply    # Cria nova com novo repositório
```

**Opção B: Atualizar manualmente na EC2**
```bash
# Conectar na EC2
ssh -i smartshow.pem ubuntu@SEU_IP

# Atualizar repositório
cd /opt/smartshow/smartshow
git remote set-url origin https://github.com/Katrashi/smartshow.git
git pull origin main

# Reiniciar aplicação
cd web-site
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## ✅ Verificação Final

Após fazer todas as alterações, verifique:

1. ✅ `terraform.tfvars` tem o novo `github_repo` e `github_token`
2. ✅ Novo repositório GitHub existe e está acessível
3. ✅ Token GitHub tem permissões corretas
4. ✅ Secrets do GitHub Actions estão configurados (se usar deploy automático)
5. ✅ Código foi enviado para o novo repositório
6. ✅ Instância EC2 será recriada ou atualizada

## 🚀 Próximos Passos

1. **Fazer commit das alterações:**
   ```bash
   git add terraform/
   git commit -m "Atualizar referências para novo repositório GitHub"
   git push origin main
   ```

2. **Aplicar Terraform:**
   ```bash
   cd terraform
   terraform plan   # Verificar mudanças
   terraform apply  # Aplicar mudanças
   ```

3. **Verificar deploy:**
   - Aguardar instância iniciar (~5 minutos)
   - Acessar: http://SEU_IP_EC2
   - Verificar logs: `docker-compose logs` na EC2

## 📝 Notas Importantes

- ⚠️ Se o repositório for **público**, não precisa do `github_token` (pode deixar vazio)
- ⚠️ Se o repositório for **privado**, o token precisa ter permissão `repo`
- ⚠️ O `user-data.sh` usa as variáveis do Terraform automaticamente, então não precisa alterar manualmente
- ⚠️ Se já tem instância rodando, precisa recriar ou atualizar manualmente












