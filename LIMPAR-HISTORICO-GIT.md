# 🧹 Limpar Histórico do Git - Remover Informações Sensíveis

## ⚠️ PROBLEMA IDENTIFICADO

O IP pessoal `200.141.32.230` ainda está no **histórico do Git** em commits anteriores. Mesmo que você tenha removido dos arquivos atuais, ele ainda pode ser visto no histórico.

## 🔍 O Que Foi Encontrado

- ✅ **Arquivos atuais:** Limpos (IP removido)
- ❌ **Histórico Git:** Ainda contém `200.141.32.230` em commits antigos
- ✅ **Tokens/Credenciais:** Apenas exemplos (não há credenciais reais)

## 🛠️ SOLUÇÃO: Limpar Histórico do Git

### **Opção 1: Usar git filter-branch (Recomendado)**

```bash
# ⚠️ ATENÇÃO: Isso reescreve o histórico. Faça backup primeiro!

# 1. Fazer backup do repositório
cd ..
cp -r loja-eletronicos loja-eletronicos-backup

# 2. Voltar para o repositório
cd loja-eletronicos

# 3. Remover IP do histórico de TODOS os arquivos
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch -r . && git reset --hard" \
  --prune-empty --tag-name-filter cat -- --all

# 4. Substituir o IP em todo o histórico
git filter-branch --force --tree-filter \
  'find . -type f -exec sed -i "s/200\.141\.32\.230/0.0.0.0/g" {} \;' \
  --prune-empty --tag-name-filter cat -- --all

# 5. Limpar referências antigas
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# 6. Garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### **Opção 2: Usar BFG Repo-Cleaner (Mais Rápido)**

```bash
# 1. Instalar BFG (se não tiver)
# Windows: Baixe de https://rtyley.github.io/bfg-repo-cleaner/

# 2. Fazer backup
cd ..
cp -r loja-eletronicos loja-eletronicos-backup

# 3. Clonar repositório espelho (sem histórico completo)
cd loja-eletronicos
git clone --mirror . ../smartshow-clean.git
cd ../smartshow-clean.git

# 4. Executar BFG para remover IP
java -jar bfg.jar --replace-text passwords.txt

# Criar arquivo passwords.txt com:
# 200.141.32.230==>0.0.0.0

# 5. Limpar
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Fazer push forçado (CUIDADO!)
git push --force
```

### **Opção 3: Recrear Repositório (Mais Simples, mas perde histórico)**

```bash
# 1. Fazer backup do código atual
cd loja-eletronicos
git checkout main
git pull origin main

# 2. Criar novo repositório limpo
cd ..
mkdir smartshow-clean
cd smartshow-clean
git init

# 3. Copiar apenas os arquivos (sem .git)
cp -r ../loja-eletronicos/* .
cp -r ../loja-eletronicos/.* . 2>/dev/null || true
rm -rf .git

# 4. Criar commit inicial limpo
git init
git add .
git commit -m "Initial commit - código limpo sem informações sensíveis"

# 5. Adicionar remote e fazer push
git remote add origin https://github.com/DavidMenezess/smartshow.git
git push -u origin main --force
```

## ⚠️ IMPORTANTE: Após Limpar o Histórico

### **1. Todos os colaboradores precisam refazer clone:**

```bash
# Remover repositório antigo
rm -rf loja-eletronicos

# Clonar novamente
git clone https://github.com/DavidMenezess/smartshow.git
```

### **2. Push forçado será necessário:**

```bash
git push origin main --force
```

**⚠️ CUIDADO:** Isso sobrescreve o histórico no GitHub. Certifique-se de que todos os colaboradores estão cientes.

## ✅ Verificação

Após limpar, verifique:

```bash
# Verificar se IP ainda está no histórico
git log --all --source --full-history -p | grep "200.141.32.230"

# Se não retornar nada, está limpo! ✅
```

## 🎯 RECOMENDAÇÃO

**Para seu caso (repositório pessoal, sem colaboradores):**

Use a **Opção 3** (Recrear Repositório) - é mais simples e segura:

1. ✅ Perde histórico antigo (mas código atual está limpo)
2. ✅ Garante que não há informações sensíveis
3. ✅ Mais rápido e menos propenso a erros
4. ✅ Histórico limpo desde o início

## 📋 Checklist Final

- [ ] Fazer backup do repositório
- [ ] Executar limpeza do histórico
- [ ] Verificar que IP foi removido
- [ ] Fazer push forçado
- [ ] Verificar no GitHub que está limpo
- [ ] Atualizar qualquer documentação que referencie o histórico antigo

## 🔒 Prevenção Futura

Para evitar isso no futuro:

1. ✅ **Sempre use `.gitignore`** para arquivos sensíveis
2. ✅ **Use `terraform.tfvars.example`** como template
3. ✅ **Nunca commite** `terraform.tfvars` real
4. ✅ **Use variáveis de ambiente** ou GitHub Secrets
5. ✅ **Revise antes de commitar:** `git diff` antes de `git add`


















