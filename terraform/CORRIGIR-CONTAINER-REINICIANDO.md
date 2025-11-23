# 🔧 CORRIGIR CONTAINER QUE ESTÁ REINICIANDO

## 🚨 Problema

O container `smartshow-api` está em estado **"Restarting"**, o que significa que ele está falhando ao iniciar e o Docker está tentando reiniciá-lo continuamente.

## 🔍 Diagnóstico

Execute este script para ver os logs e identificar o erro:

```powershell
cd C:\Users\User\Documents\Estudo\loja-eletronicos\terraform
.\verificar-logs-container.ps1
```

Ou, se estiver conectado na instância:

```bash
cd /opt/smartshow/smartshow/web-site
sudo docker-compose logs --tail=100 smartshow-api
```

## 🔧 Soluções Comuns

### Solução 1: Verificar Logs e Corrigir Erro

Os logs vão mostrar o erro específico. Erros comuns:

1. **Erro de banco de dados** - Diretório `data/` não existe ou sem permissão
2. **Erro de dependências** - `node_modules` não instalado corretamente
3. **Erro de porta** - Porta 3000 já está em uso
4. **Erro de arquivo** - Arquivo `server.js` ou `package.json` não encontrado

### Solução 2: Recriar Container do Zero

```powershell
aws ssm send-command `
  --instance-ids i-XXXXXXXXXXXXX `
  --document-name "AWS-RunShellScript" `
  --parameters commands=@(
    "cd /opt/smartshow/smartshow/web-site",
    "sudo docker-compose down",
    "sudo docker-compose rm -f smartshow-api",
    "sudo docker rmi web-site-smartshow-api || true",
    "sudo docker-compose build --no-cache",
    "sudo docker-compose up -d",
    "sleep 10",
    "sudo docker-compose ps",
    "sudo docker-compose logs --tail=50 smartshow-api"
  ) `
  --region sa-east-1
```

### Solução 3: Verificar e Corrigir Diretórios

```powershell
aws ssm send-command `
  --instance-ids i-XXXXXXXXXXXXX `
  --document-name "AWS-RunShellScript" `
  --parameters commands=@(
    "cd /opt/smartshow/smartshow/web-site",
    "echo '📁 Criando diretórios necessários...'",
    "mkdir -p api/data api/output api/uploads",
    "chmod -R 777 api/data api/output api/uploads",
    "chown -R ubuntu:ubuntu api/",
    "echo '✅ Diretórios criados'",
    "echo ''",
    "echo '🔄 Reiniciando container...'",
    "sudo docker-compose restart smartshow-api",
    "sleep 10",
    "sudo docker-compose ps",
    "sudo docker-compose logs --tail=30 smartshow-api"
  ) `
  --region sa-east-1
```

### Solução 4: Verificar se Porta Está em Uso

```bash
# Na instância EC2
sudo netstat -tulpn | grep 3000
sudo lsof -i :3000
```

Se a porta estiver em uso, pare o processo ou mude a porta no `docker-compose.yml`.

## 📋 Checklist de Verificação

- [ ] Verificar logs do container (`docker-compose logs smartshow-api`)
- [ ] Verificar se diretórios `data/`, `output/`, `uploads/` existem
- [ ] Verificar permissões dos diretórios (devem ser 777 ou 755)
- [ ] Verificar se `package.json` existe e está correto
- [ ] Verificar se `server.js` existe
- [ ] Verificar se porta 3000 está livre
- [ ] Verificar se banco de dados pode ser criado/acessado

## 🎯 Próximos Passos

1. **Execute o script de verificação de logs** para ver o erro específico
2. **Analise os logs** para identificar a causa
3. **Aplique a solução** apropriada baseada no erro
4. **Teste novamente** a aplicação

## 💡 Dica

O erro mais comum é falta de diretórios ou permissões incorretas. Certifique-se de que:
- `/opt/smartshow/smartshow/web-site/api/data` existe
- `/opt/smartshow/smartshow/web-site/api/output` existe
- `/opt/smartshow/smartshow/web-site/api/uploads` existe
- Todos têm permissões corretas (777 ou 755)




