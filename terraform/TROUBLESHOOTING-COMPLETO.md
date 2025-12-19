# 🔧 TROUBLESHOOTING COMPLETO - SSH e Aplicação Não Carrega

## 🚨 Problemas Identificados

1. **SSH não funciona** - "Permission denied (publickey)"
2. **Aplicação não carrega** - ERR_CONNECTION_REFUSED
3. **IP mudou** - Nova instância após `terraform destroy` e `terraform apply`

## ✅ SOLUÇÃO 1: Acessar via AWS Systems Manager (SEM SSH!)

Esta é a forma mais confiável e não requer chave SSH:

### Passo 1: Obter Instance ID

```powershell
# Obter o IP atual da instância
cd C:\Users\User\Documents\Estudo\loja-eletronicos\terraform
terraform output public_ip

# Obter Instance ID pelo IP
aws ec2 describe-instances `
  --region sa-east-1 `
  --filters "Name=ip-address,Values=54.232.140.177" `
  --query "Reservations[*].Instances[*].[InstanceId,State.Name]" `
  --output table
```

### Passo 2: Instalar AWS Session Manager Plugin

Baixe e instale:
https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

Ou via Chocolatey:
```powershell
choco install aws-session-manager-plugin
```

### Passo 3: Conectar via Session Manager

```powershell
# Substitua i-XXXXXXXXX pelo Instance ID obtido no Passo 1
aws ssm start-session --target i-XXXXXXXXX --region sa-east-1
```

### Passo 4: Verificar Aplicação

Uma vez conectado, execute:

```bash
# Verificar containers
cd /opt/smartshow/smartshow/web-site
docker-compose ps

# Se não estiverem rodando, iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f smartshow-api

# Verificar API
curl http://localhost:3000/api/health

# Ver logs do user-data
tail -f /var/log/user-data.log
```

## ✅ SOLUÇÃO 2: Corrigir SSH (Windows)

### Opção A: Usar SSH Agent

```powershell
# 1. Iniciar SSH Agent
Start-Service ssh-agent

# 2. Adicionar chave
ssh-add C:\Users\User\Documents\AWS\SSH\smartshow.pem

# 3. Conectar
ssh ubuntu@54.232.140.177
```

### Opção B: Verificar Formato da Chave

```powershell
# Verificar primeira linha
Get-Content C:\Users\User\Documents\AWS\SSH\smartshow.pem -First 1

# Deve começar com:
# -----BEGIN RSA PRIVATE KEY-----
# ou
# -----BEGIN OPENSSH PRIVATE KEY-----
```

### Opção C: Converter Chave (se necessário)

```powershell
# Converter para formato OpenSSH
ssh-keygen -p -m PEM -f C:\Users\User\Documents\AWS\SSH\smartshow.pem
```

### Opção D: Verificar Chave na AWS

```powershell
# Verificar qual chave está associada à instância
aws ec2 describe-instances `
  --region sa-east-1 `
  --filters "Name=ip-address,Values=54.232.140.177" `
  --query "Reservations[*].Instances[*].[InstanceId,KeyName]" `
  --output table
```

**IMPORTANTE**: A chave deve ser exatamente `smartshow` (sem extensão `.pem`).

## ✅ SOLUÇÃO 3: Verificar Aplicação sem SSH

### Via AWS Console

1. Acesse **EC2 > Instances**
2. Selecione a instância
3. Clique em **Connect**
4. Escolha **Session Manager** (se disponível)
5. Ou use **EC2 Instance Connect**

### Via AWS CLI (verificar logs)

```powershell
# Obter Instance ID
$instanceId = aws ec2 describe-instances `
  --region sa-east-1 `
  --filters "Name=ip-address,Values=54.232.140.177" `
  --query "Reservations[0].Instances[0].InstanceId" `
  --output text

# Ver logs do user-data via Systems Manager
aws ssm send-command `
  --instance-ids $instanceId `
  --document-name "AWS-RunShellScript" `
  --parameters commands="tail -50 /var/log/user-data.log" `
  --region sa-east-1 `
  --query "Command.CommandId" `
  --output text

# Aguardar e obter resultado
aws ssm get-command-invocation `
  --command-id <COMMAND_ID> `
  --instance-id $instanceId `
  --region sa-east-1
```

## ✅ SOLUÇÃO 4: Recriar Chave SSH na AWS

Se a chave estiver corrompida ou não funcionar:

### Passo 1: Criar Nova Chave

```powershell
# Criar nova chave na AWS
aws ec2 create-key-pair `
  --key-name smartshow-new `
  --region sa-east-1 `
  --query 'KeyMaterial' `
  --output text > C:\Users\User\Documents\AWS\SSH\smartshow-new.pem

# Definir permissões (Windows)
icacls C:\Users\User\Documents\AWS\SSH\smartshow-new.pem /inheritance:r
icacls C:\Users\User\Documents\AWS\SSH\smartshow-new.pem /grant:r "$($env:USERNAME):R"
```

### Passo 2: Atualizar Terraform

Edite `terraform.tfvars`:

```hcl
key_name = "smartshow-new"
```

### Passo 3: Recriar Instância

```powershell
cd C:\Users\User\Documents\Estudo\loja-eletronicos\terraform
terraform destroy -auto-approve
terraform apply -auto-approve
```

## ✅ SOLUÇÃO 5: Verificar Security Group

Certifique-se de que as portas estão abertas:

```powershell
# Obter Security Group ID
$sgId = aws ec2 describe-instances `
  --region sa-east-1 `
  --filters "Name=ip-address,Values=54.232.140.177" `
  --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" `
  --output text

# Ver regras do Security Group
aws ec2 describe-security-groups `
  --group-ids $sgId `
  --region sa-east-1 `
  --query "SecurityGroups[0].IpPermissions" `
  --output json
```

Deve ter:
- **Porta 22** (SSH) - aberta para seu IP ou 0.0.0.0/0
- **Porta 80** (HTTP) - aberta para 0.0.0.0/0
- **Porta 3000** (API) - aberta para 0.0.0.0/0

## ✅ SOLUÇÃO 6: Verificar se Aplicação Está Rodando

### Via Browser (testar endpoints)

1. **Teste HTTP direto**: `http://54.232.140.177`
2. **Teste API**: `http://54.232.140.177:3000/api/health`
3. **Teste Nginx**: `http://54.232.140.177` (deve redirecionar para porta 3000)

### Via PowerShell (testar conectividade)

```powershell
# Testar porta 80
Test-NetConnection -ComputerName 54.232.140.177 -Port 80

# Testar porta 3000
Test-NetConnection -ComputerName 54.232.140.177 -Port 3000

# Testar porta 22 (SSH)
Test-NetConnection -ComputerName 54.232.140.177 -Port 22
```

## ✅ SOLUÇÃO 7: Aguardar Inicialização Completa

O `user-data.sh` leva **5-10 minutos** para completar. Verifique:

1. **Aguarde 10 minutos** após `terraform apply`
2. **Verifique logs** via Systems Manager (Solução 1)
3. **Teste novamente** as URLs

## 🔍 Diagnóstico Rápido

Execute este script PowerShell para diagnóstico completo:

```powershell
cd C:\Users\User\Documents\Estudo\loja-eletronicos\terraform
.\testar-ssh.ps1
```

## 📋 Checklist de Verificação

- [ ] Instância EC2 está em estado "running"
- [ ] Security Group permite SSH (porta 22)
- [ ] Security Group permite HTTP (porta 80)
- [ ] Security Group permite API (porta 3000)
- [ ] Chave SSH existe localmente
- [ ] Chave SSH está no formato correto
- [ ] Chave SSH na AWS corresponde ao nome em `terraform.tfvars`
- [ ] Aguardou 10 minutos após `terraform apply`
- [ ] Testou acesso via Systems Manager
- [ ] Verificou logs do user-data

## 🚀 Próximos Passos

1. **Tente primeiro**: AWS Systems Manager (Solução 1) - mais confiável
2. **Se não tiver Systems Manager**: Corrija SSH (Solução 2)
3. **Verifique aplicação**: Aguarde 10 minutos e teste URLs
4. **Se nada funcionar**: Recrie a chave SSH (Solução 4)

## 📞 Comandos Úteis

```powershell
# Obter IP atual
terraform output public_ip

# Obter Instance ID
aws ec2 describe-instances --region sa-east-1 --filters "Name=ip-address,Values=54.232.140.177" --query "Reservations[0].Instances[0].InstanceId" --output text

# Conectar via Systems Manager
aws ssm start-session --target <INSTANCE_ID> --region sa-east-1

# Verificar status da instância
aws ec2 describe-instance-status --instance-ids <INSTANCE_ID> --region sa-east-1
```































