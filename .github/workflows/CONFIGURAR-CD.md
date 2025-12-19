# 🚀 Configuração do CD (Continuous Deployment)

Este documento explica como configurar o Continuous Deployment para o projeto Smartshow.

## 📋 Pré-requisitos

1. **Credenciais AWS configuradas no GitHub Secrets:**
   - `AWS_ACCESS_KEY_ID` - Sua chave de acesso AWS
   - `AWS_SECRET_ACCESS_KEY` - Sua chave secreta AWS

2. **Chave SSH da EC2 configurada no GitHub Secrets:**
   - `EC2_SSH_PRIVATE_KEY` - Conteúdo completo do arquivo `.pem` da chave SSH

## 🔧 Como Configurar os Secrets

### 1. Credenciais AWS

1. Vá para: **GitHub → Seu Repositório → Settings → Secrets and variables → Actions**
2. Clique em **"New repository secret"**
3. Adicione:
   - **Name:** `AWS_ACCESS_KEY_ID`
   - **Value:** Sua chave de acesso AWS
4. Repita para `AWS_SECRET_ACCESS_KEY`

### 2. Chave SSH da EC2

1. No mesmo local (Secrets and variables → Actions)
2. Clique em **"New repository secret"**
3. Adicione:
   - **Name:** `EC2_SSH_PRIVATE_KEY`
   - **Value:** Cole o conteúdo completo do arquivo `smartshow.pem` (incluindo `-----BEGIN RSA PRIVATE KEY-----` e `-----END RSA PRIVATE KEY-----`)

## 📝 Workflows Disponíveis

### 1. Terraform Apply (`terraform-apply.yml`)

**Quando executa:**
- Push na branch `main` com mudanças em `terraform/**`
- Manualmente via `workflow_dispatch`

**O que faz:**
- Aplica mudanças na infraestrutura AWS
- Cria/atualiza recursos EC2, Security Groups, etc.

**Como usar:**
```bash
# Automaticamente ao fazer push:
git push origin main

# Ou manualmente:
# GitHub → Actions → Terraform Apply → Run workflow
```

### 2. Deploy Aplicação (`deploy.yml`)

**Quando executa:**
- Push na branch `main` com mudanças em `web-site/**`
- Manualmente via `workflow_dispatch`

**O que faz:**
- Encontra a instância EC2
- Atualiza o código do repositório na EC2
- Reconstrui e reinicia os containers Docker

**Como usar:**
```bash
# Automaticamente ao fazer push:
git push origin main

# Ou manualmente:
# GitHub → Actions → Deploy Aplicação → Run workflow
```

## 🔍 Troubleshooting

### Erro: "failed to get shared config profile, smartshow"

**Causa:** O Terraform está tentando usar um perfil AWS que não existe no CI/CD.

**Solução:** ✅ **Já corrigido!** O provider agora usa variáveis de ambiente quando o perfil não está disponível.

### Erro: "InvalidInstanceID.Malformed: Invalid id: 'None'"

**Causa:** A instância EC2 não foi encontrada.

**Soluções:**
1. Verifique se a instância existe na região `sa-east-1`
2. Verifique se a tag `Name` está configurada como `smartshow-prod`
3. Verifique se a instância está no estado `running`

### Erro: "EC2_SSH_PRIVATE_KEY não configurado"

**Causa:** O secret `EC2_SSH_PRIVATE_KEY` não foi configurado no GitHub.

**Solução:** Configure o secret conforme instruções acima.

### Erro: "Permission denied (publickey)"

**Causa:** A chave SSH não tem permissões corretas ou está incorreta.

**Solução:**
1. Verifique se o conteúdo do secret `EC2_SSH_PRIVATE_KEY` está completo
2. Certifique-se de que a chave corresponde à chave configurada na EC2

## 📊 Monitoramento

Após cada deploy, você pode verificar:

1. **Status do workflow:** GitHub → Actions
2. **Logs da aplicação:** SSH na EC2 → `docker-compose logs`
3. **Status dos containers:** SSH na EC2 → `docker-compose ps`
4. **Health check:** `curl http://SEU_IP:3000/api/health`

## 🎯 Fluxo Completo de Deploy

1. **Desenvolver localmente**
2. **Commit e push:**
   ```bash
   git add .
   git commit -m "Sua mensagem"
   git push origin main
   ```
3. **CI executa automaticamente:**
   - Valida código
   - Executa testes
4. **CD executa automaticamente:**
   - Se mudou `terraform/**` → Executa `terraform-apply.yml`
   - Se mudou `web-site/**` → Executa `deploy.yml`
5. **Aplicação atualizada na EC2!** 🎉

## 🔐 Segurança

- ✅ Credenciais AWS armazenadas como secrets (não expostas)
- ✅ Chave SSH armazenada como secret (não exposta)
- ✅ SSH com `StrictHostKeyChecking=no` apenas no CI/CD
- ✅ IP restrito para SSH (configurado no Security Group)

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do workflow no GitHub Actions
2. Verifique os logs dos containers na EC2
3. Verifique se todos os secrets estão configurados corretamente




























