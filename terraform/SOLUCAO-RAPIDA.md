# 🚀 SOLUÇÃO RÁPIDA - Aplicação Não Inicia Automaticamente

## 🔍 Problema Identificado

O erro `no configuration file provided: not found` acontece porque você está executando `docker-compose ps` no diretório errado.

O `docker-compose.yml` está em `/opt/smartshow/smartshow/web-site/`, mas você está em `/opt/smartshow/smartshow/`.

## ✅ Solução Imediata

### Opção 1: Executar Script de Correção (Recomendado)

```powershell
cd C:\Users\User\Documents\Estudo\loja-eletronicos\terraform
.\corrigir-aplicacao-auto.ps1
```

Escolha a opção **1** para iniciar a aplicação manualmente.

### Opção 2: Iniciar Manualmente via Systems Manager

```powershell
aws ssm send-command `
  --instance-ids i-XXXXXXXXXXXXX `
  --document-name "AWS-RunShellScript" `
  --parameters commands=@(
    "cd /opt/smartshow/smartshow/web-site",
    "docker-compose down || true",
    "docker-compose build --no-cache",
    "docker-compose up -d",
    "sleep 10",
    "docker-compose ps"
  ) `
  --region sa-east-1
```

Aguarde 30 segundos e veja o resultado:

```powershell
Start-Sleep -Seconds 30
$commandId = aws ssm list-command-invocations --instance-id i-XXXXXXXXXXXXX --region sa-east-1 --max-items 1 --query "CommandInvocations[0].CommandId" --output text
aws ssm get-command-invocation --command-id $commandId --instance-id i-XXXXXXXXXXXXX --region sa-east-1 --query "StandardOutputContent" --output text
```

### Opção 3: Conectar via Systems Manager e Executar Manualmente

```powershell
aws ssm start-session --target i-XXXXXXXXXXXXX --region sa-east-1
```

Depois de conectar, execute:

```bash
cd /opt/smartshow/smartshow/web-site
docker-compose ps
docker-compose up -d
docker-compose ps
```

## 🔍 Por Que Não Iniciou Automaticamente?

### Possíveis Causas:

1. **User-data ainda está executando** - Aguarde 10-15 minutos após `terraform apply`
2. **Repositório não foi clonado** - Verifique logs do user-data
3. **Erro no build dos containers** - Verifique logs do Docker
4. **Diretório errado** - O user-data deve mudar para `web-site/` antes de executar docker-compose

## 🔧 Verificar Status do User-Data

```powershell
aws ssm send-command `
  --instance-ids i-XXXXXXXXXXXXX `
  --document-name "AWS-RunShellScript" `
  --parameters commands="tail -100 /var/log/user-data.log" `
  --region sa-east-1
```

Aguarde 5 segundos:

```powershell
Start-Sleep -Seconds 5
$commandId = aws ssm list-command-invocations --instance-id i-XXXXXXXXXXXXX --region sa-east-1 --max-items 1 --query "CommandInvocations[0].CommandId" --output text
aws ssm get-command-invocation --command-id $commandId --instance-id i-XXXXXXXXXXXXX --region sa-east-1 --query "StandardOutputContent" --output text
```

## 📋 Checklist

- [ ] Verificar se user-data completou (aguardar 15 minutos)
- [ ] Verificar se repositório foi clonado
- [ ] Verificar se docker-compose.yml existe em `web-site/`
- [ ] Iniciar aplicação manualmente se necessário
- [ ] Testar URLs: http://54.232.140.177 e http://54.232.140.177:3000

## 🎯 Próximos Passos

1. **Execute o script de correção** (`corrigir-aplicacao-auto.ps1`)
2. **Escolha opção 1** para iniciar a aplicação
3. **Aguarde 30 segundos** e verifique o resultado
4. **Teste as URLs** no browser

Se ainda não funcionar, verifique os logs do user-data para identificar onde o processo falhou.




