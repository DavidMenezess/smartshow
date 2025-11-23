# ⚠️ AVISO: Deploy Automático Desabilitado

## 🔒 Mudança Importante

O workflow `terraform-apply.yml` **NÃO executa mais automaticamente** quando você faz push.

### ❌ Antes (Perigoso)
- Qualquer push em `terraform/**` executava `terraform apply` automaticamente
- Isso podia criar/destruir recursos sem você querer

### ✅ Agora (Seguro)
- `terraform apply` só executa **manualmente** via GitHub Actions
- Você tem controle total sobre quando aplicar mudanças

## 🚀 Como Executar Terraform Apply Agora

### Opção 1: Via GitHub Actions (Recomendado)

1. Vá para: **GitHub → Seu Repositório → Actions**
2. Selecione o workflow **"Terraform Apply"**
3. Clique em **"Run workflow"**
4. Escolha a ação:
   - **plan** - Apenas ver o que será feito (não aplica)
   - **apply** - Aplicar mudanças na AWS
   - **destroy** - Destruir recursos
5. Clique em **"Run workflow"**

### Opção 2: Localmente (Via Terminal)

```bash
cd terraform
terraform plan    # Ver o que será feito
terraform apply   # Aplicar mudanças
```

## 📋 Workflows Disponíveis

### 1. Terraform Apply (Manual)
- **Quando:** Apenas quando você executar manualmente
- **O que faz:** Aplica mudanças na infraestrutura AWS
- **Como usar:** GitHub Actions → Terraform Apply → Run workflow

### 2. Deploy Aplicação (Automático)
- **Quando:** Push em `web-site/**`
- **O que faz:** Atualiza código na EC2 existente
- **Seguro:** Não cria/destrói recursos, só atualiza aplicação

## 🔍 Verificar se há Instâncias Rodando

Se você viu uma instância criada sem querer:

1. **Verificar no GitHub Actions:**
   - GitHub → Actions → Ver histórico de workflows
   - Ver qual workflow executou `terraform apply`

2. **Destruir a instância (se necessário):**
   ```bash
   # Via GitHub Actions:
   # Actions → Terraform Apply → Run workflow → destroy
   
   # Ou localmente:
   cd terraform
   terraform destroy
   ```

## ✅ Recomendação

Para mudanças na infraestrutura:
- Use `terraform plan` primeiro para ver o que será feito
- Use `terraform apply` apenas quando tiver certeza
- Use GitHub Actions para ter histórico e controle

Para atualizações da aplicação:
- O workflow `deploy.yml` continua automático (seguro)
- Ele só atualiza código, não cria recursos

