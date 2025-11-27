# 🚀 Como Executar o Deploy Manualmente

## ✅ Secrets Configuradas

Você confirmou que todas as secrets estão configuradas:
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `EC2_SSH_PRIVATE_KEY`
- ✅ `SMART_TOKEN`

## 🔧 Executar Deploy Manualmente

### Método 1: Via Interface do GitHub (Recomendado)

1. **Acesse a página de Actions:**
   ```
   https://github.com/DavidMenezess/smartshow/actions
   ```

2. **Clique no workflow "Deploy Aplicação"** no menu lateral esquerdo

3. **Clique no botão "Run workflow"** (canto superior direito)

4. **Selecione:**
   - Branch: `main`
   - Deixe os campos vazios (não há inputs necessários)

5. **Clique em "Run workflow"** novamente

6. **Aguarde a execução** (aproximadamente 2-3 minutos)

### Método 2: Via API do GitHub (Avançado)

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  https://api.github.com/repos/DavidMenezess/smartshow/actions/workflows/deploy.yml/dispatches \
  -d '{"ref":"main"}'
```

## 🔍 Verificar Por Que Não Está Executando Automaticamente

### 1. Verificar se o Workflow Está Habilitado

1. Acesse: `https://github.com/DavidMenezess/smartshow/settings/actions`
2. Verifique se "Allow all actions and reusable workflows" está habilitado
3. Verifique se não há restrições de branch

### 2. Verificar Histórico de Execuções

1. Acesse: `https://github.com/DavidMenezess/smartshow/actions/workflows/deploy.yml`
2. Veja se há execuções anteriores
3. Se houver falhas, clique para ver os logs

### 3. Verificar Condições do Trigger

O workflow está configurado para executar quando:
- ✅ Push na branch `main`
- ✅ Mudanças em `web-site/**`
- ✅ Mudanças em `.github/workflows/deploy.yml`
- ✅ Execução manual via `workflow_dispatch`

## 🐛 Possíveis Problemas

### Problema 1: Workflow Não Aparece nas Actions

**Solução:**
- Verifique se o arquivo está em `.github/workflows/deploy.yml`
- Verifique se o YAML está válido (sem erros de sintaxe)
- Faça um commit vazio para forçar atualização:
  ```bash
  git commit --allow-empty -m "Trigger workflow check"
  git push origin main
  ```

### Problema 2: Workflow Falha na Execução

**Verifique os logs:**
1. Acesse a execução que falhou
2. Veja qual step falhou
3. Verifique os logs do step

**Problemas comuns:**
- ❌ Secrets não configuradas corretamente
- ❌ Instância EC2 não encontrada
- ❌ Permissões AWS insuficientes
- ❌ SSM não habilitado na EC2

### Problema 3: Workflow Não Dispara Automaticamente

**Soluções:**
1. **Verificar se o arquivo está no caminho correto:**
   - Deve estar em: `.github/workflows/deploy.yml`
   - Não deve estar em subpastas

2. **Verificar sintaxe YAML:**
   ```bash
   # Instalar yamllint (opcional)
   pip install yamllint
   yamllint .github/workflows/deploy.yml
   ```

3. **Forçar execução manual** (Método 1 acima)

## 📋 Checklist de Verificação

Antes de executar o deploy, verifique:

- [ ] Secrets configuradas no GitHub
- [ ] Instância EC2 está rodando
- [ ] Tag `Name=smartshow-prod` na instância
- [ ] Região AWS correta (`sa-east-1`)
- [ ] Permissões AWS corretas (EC2, SSM)
- [ ] Workflow habilitado no repositório

## 🎯 Próximos Passos

1. **Execute o deploy manualmente** usando o Método 1
2. **Aguarde a conclusão** (2-3 minutos)
3. **Verifique os logs** se houver erro
4. **Teste a aplicação** após o deploy

## 📞 Se Ainda Não Funcionar

1. Verifique os logs completos do workflow
2. Verifique se a instância EC2 está acessível
3. Teste as credenciais AWS manualmente
4. Verifique se o SSM está habilitado na EC2

---

**Última atualização:** 2024-11-25



