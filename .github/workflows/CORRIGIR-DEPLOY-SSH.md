# 🔧 Como Corrigir o Erro de Deploy SSH

## ❌ Erro: "Permission denied (publickey)"

O deploy está falhando porque não consegue autenticar via SSH na EC2.

## ✅ Soluções

### **Opção 1: Usar AWS Systems Manager (SSM) - RECOMENDADO** ⭐

O workflow agora tenta usar SSM primeiro, que é mais seguro e não requer chaves SSH.

#### Passo 1: Habilitar SSM na EC2

1. **Acesse o AWS Console** → EC2 → Instâncias
2. **Selecione sua instância** → Actions → Security → Modify IAM role
3. **Crie/Selecione uma IAM Role** com a política `AmazonSSMManagedInstanceCore`
4. **Aplique a role** à instância

#### Passo 2: Verificar se SSM Agent está rodando

Conecte via SSH (se ainda conseguir) e execute:

```bash
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
# ou
sudo systemctl status amazon-ssm-agent
```

Se não estiver rodando:

```bash
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent
```

#### Passo 3: Testar SSM

```bash
aws ssm describe-instance-information --region sa-east-1
```

Se sua instância aparecer na lista, SSM está funcionando! ✅

---

### **Opção 2: Configurar Chave SSH no GitHub** 🔑

Se preferir usar SSH (ou SSM não estiver disponível):

#### Passo 1: Obter a chave SSH

Você precisa do arquivo `.pem` que foi usado para criar a instância EC2.

**Se você não tem a chave:**
1. Crie uma nova chave na AWS: EC2 → Key Pairs → Create key pair
2. Baixe o arquivo `.pem`
3. **IMPORTANTE:** Você precisará recriar a instância ou adicionar a chave manualmente na EC2

#### Passo 2: Converter para formato OpenSSH (se necessário)

A chave deve estar no formato **OpenSSH** (não PuTTY).

**Formato correto:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

**Ou formato RSA:**
```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

**Se você tem apenas `.ppk` (PuTTY):**
1. Abra o PuTTYgen
2. Load → Selecione seu arquivo `.ppk`
3. Conversions → Export OpenSSH key
4. Salve como `.pem`

#### Passo 3: Adicionar no GitHub Secrets

1. **GitHub** → Seu repositório → Settings → Secrets and variables → Actions
2. **New repository secret**
3. **Name:** `EC2_SSH_PRIVATE_KEY`
4. **Value:** Cole o conteúdo **COMPLETO** do arquivo `.pem` (incluindo `-----BEGIN` e `-----END`)
5. **Add secret**

#### Passo 4: Verificar formato

O secret deve conter:
- ✅ Linha inicial: `-----BEGIN ... PRIVATE KEY-----`
- ✅ Linha final: `-----END ... PRIVATE KEY-----`
- ✅ Todo o conteúdo entre essas linhas
- ✅ Quebras de linha preservadas

---

## 🔍 Verificar se está funcionando

Após configurar SSM ou SSH:

1. **Faça um novo commit** (ou dispare o workflow manualmente)
2. **Acompanhe o deploy** em: GitHub → Actions → Deploy Aplicação
3. **Verifique os logs** do step "Atualizar aplicação na EC2"

### ✅ Sucesso via SSM:
```
🔐 Tentando usar AWS Systems Manager (SSM)...
✅ Comando SSM enviado: abc-123-def
⏳ Aguardando execução (60 segundos)...
📋 Saída do comando:
...
✅ Deploy via SSM concluído com sucesso!
```

### ✅ Sucesso via SSH:
```
⚠️ SSM não disponível, tentando SSH...
📦 Atualizando repositório...
...
🎉 Deploy concluído com sucesso!
```

---

## 🚨 Problemas Comuns

### "SSM não disponível"
- **Causa:** IAM Role não configurada ou SSM Agent não instalado
- **Solução:** Siga a Opção 1 acima

### "Chave SSH não encontrada"
- **Causa:** Secret `EC2_SSH_PRIVATE_KEY` não configurado
- **Solução:** Siga a Opção 2 acima

### "Permission denied (publickey)"
- **Causa:** Chave SSH incorreta ou formato errado
- **Solução:** 
  1. Verifique se a chave está no formato OpenSSH
  2. Verifique se o secret contém a chave completa
  3. Tente usar SSM em vez de SSH

### "SSM command failed"
- **Causa:** Permissões IAM insuficientes ou instância não registrada no SSM
- **Solução:** Verifique a IAM Role e o status do SSM Agent

---

## 📝 Checklist

- [ ] IAM Role com `AmazonSSMManagedInstanceCore` configurada na EC2 (para SSM)
- [ ] SSM Agent instalado e rodando na EC2 (para SSM)
- [ ] Secret `EC2_SSH_PRIVATE_KEY` configurado no GitHub (para SSH)
- [ ] Chave SSH no formato OpenSSH (para SSH)
- [ ] Security Group permite SSH de `0.0.0.0/0` (para GitHub Actions)

---

## 💡 Recomendação

**Use SSM** sempre que possível:
- ✅ Mais seguro (não expõe portas SSH)
- ✅ Não requer gerenciamento de chaves
- ✅ Funciona mesmo sem IP público
- ✅ Logs centralizados no AWS CloudWatch













