# 🔑 Como Corrigir o Erro de Chave SSH no Deploy

## ⚠️ Erro Atual

```
Load key "/home/runner/.ssh/smartshow.pem": error in libcrypto
Permission denied (publickey)
```

## 🔍 Causa

A chave SSH no GitHub Secret pode estar:
1. Em formato incorreto (PuTTY em vez de OpenSSH)
2. Com encoding incorreto (quebras de linha perdidas)
3. Incompleta ou corrompida

## ✅ Solução

### Passo 1: Verificar o Formato da Chave

A chave SSH deve estar no formato **OpenSSH** (não PuTTY). Deve começar com:

```
-----BEGIN RSA PRIVATE KEY-----
ou
-----BEGIN OPENSSH PRIVATE KEY-----
ou
-----BEGIN EC PRIVATE KEY-----
```

E terminar com:

```
-----END RSA PRIVATE KEY-----
ou
-----END OPENSSH PRIVATE KEY-----
ou
-----END EC PRIVATE KEY-----
```

### Passo 2: Obter o Conteúdo Correto da Chave

#### No Windows (PowerShell):

```powershell
# Ler o arquivo .pem completo
Get-Content smartshow.pem -Raw
```

#### No Linux/Mac:

```bash
# Ler o arquivo .pem completo
cat smartshow.pem
```

### Passo 3: Converter de PuTTY para OpenSSH (se necessário)

Se você tem apenas a chave PuTTY (.ppk), converta para OpenSSH:

#### Usando PuTTYgen:

1. Abra PuTTYgen
2. Carregue a chave .ppk
3. Clique em "Conversions" → "Export OpenSSH key"
4. Salve como `smartshow.pem`

#### Ou usando puttygen via linha de comando:

```bash
puttygen smartshow.ppk -O private-openssh -o smartshow.pem
```

### Passo 4: Atualizar o GitHub Secret

1. Acesse: **GitHub → Settings → Secrets and variables → Actions**
2. Encontre ou crie o secret: **`EC2_SSH_PRIVATE_KEY`**
3. Cole o conteúdo **COMPLETO** do arquivo `.pem`, incluindo:
   - A linha `-----BEGIN ... PRIVATE KEY-----`
   - Todas as linhas do meio
   - A linha `-----END ... PRIVATE KEY-----`
4. **IMPORTANTE:** Mantenha todas as quebras de linha!

### Passo 5: Verificar o Secret

O secret deve conter algo como:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(muitas linhas aqui)
...
-----END RSA PRIVATE KEY-----
```

## 🔧 Verificação Local

Para testar se a chave funciona localmente:

```bash
# Testar conexão SSH
ssh -i smartshow.pem ubuntu@56.126.14.115

# Ou verificar formato
head -n 1 smartshow.pem
tail -n 1 smartshow.pem
```

## 📋 Checklist

- [ ] Chave está no formato OpenSSH (não PuTTY)
- [ ] Chave começa com `-----BEGIN ... PRIVATE KEY-----`
- [ ] Chave termina com `-----END ... PRIVATE KEY-----`
- [ ] Todas as quebras de linha foram preservadas
- [ ] Secret `EC2_SSH_PRIVATE_KEY` foi atualizado no GitHub
- [ ] Security Group permite SSH de qualquer IP (0.0.0.0/0)

## 🚨 Problemas Comuns

### 1. Chave em formato PuTTY (.ppk)
**Solução:** Converta para OpenSSH usando PuTTYgen

### 2. Quebras de linha perdidas
**Solução:** Use `Get-Content -Raw` no PowerShell ou `cat` no Linux

### 3. Chave incompleta
**Solução:** Certifique-se de copiar TODO o conteúdo, incluindo BEGIN e END

### 4. Encoding incorreto
**Solução:** Use UTF-8 sem BOM ao salvar o secret

## 🎯 Após Corrigir

1. Atualize o secret `EC2_SSH_PRIVATE_KEY` no GitHub
2. Execute o workflow novamente (ou faça um novo push)
3. O deploy deve conseguir conectar via SSH

## 📝 Nota

Se você não tem mais o arquivo `.pem` original:
1. Crie uma nova chave SSH na AWS
2. Baixe a chave
3. Associe a nova chave à instância EC2
4. Atualize o secret no GitHub




























