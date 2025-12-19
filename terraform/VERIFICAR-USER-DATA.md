# 🔍 Como Verificar se o User-Data Executou

Se a EC2 subiu mas nada foi configurado, siga estes passos:

## 1. Verificar Logs do User-Data

```bash
# Conectar na EC2
ssh -i smartshow.pem ubuntu@SEU_IP

# Ver logs do user-data
sudo cat /var/log/user-data.log

# Ou ver em tempo real (se ainda estiver executando)
sudo tail -f /var/log/user-data.log
```

## 2. Verificar se o Script Executou

```bash
# Verificar se o diretório foi criado
ls -la /opt/smartshow/

# Verificar se o repositório foi clonado
ls -la /opt/smartshow/smartshow/

# Verificar se Docker está instalado
docker --version
docker-compose --version

# Verificar se containers estão rodando
cd /opt/smartshow/smartshow/web-site
docker-compose ps
```

## 3. Se o User-Data Não Executou

### Opção 1: Executar Manualmente (Temporário)

```bash
# Conectar na EC2
ssh -i smartshow.pem ubuntu@SEU_IP

# Executar o script manualmente
sudo bash /var/lib/cloud/instances/*/user-data.txt
```

### Opção 2: Recriar a Instância (Recomendado)

```bash
# Destruir instância atual
cd terraform
terraform destroy

# Recriar (vai executar user-data novamente)
terraform apply
```

## 4. Problemas Comuns

### User-Data não executa
- **Causa:** Script com erro de sintaxe ou permissões
- **Solução:** Verificar logs em `/var/log/user-data.log`

### Repositório não clona
- **Causa:** Token GitHub inválido ou repositório privado sem acesso
- **Solução:** Verificar `github_token` no `terraform.tfvars`

### Docker não instala
- **Causa:** Problemas de rede ou repositórios
- **Solução:** Verificar logs e conexão com internet

### Containers não iniciam
- **Causa:** Erro no build ou permissões
- **Solução:** Verificar logs com `docker-compose logs`

## 5. Forçar Reexecução do User-Data

Se você mudou o `user-data.sh` e quer reexecutar:

```bash
# Opção 1: Recriar instância
terraform taint aws_instance.smartshow
terraform apply

# Opção 2: Executar script manualmente na EC2
ssh -i smartshow.pem ubuntu@SEU_IP
sudo bash /opt/smartshow/smartshow/web-site/../user-data.sh
```
































