# ========================================
# CORRIGIR PERMISSÕES DO DOCKER
# ========================================
# Script para corrigir permissões do Docker e iniciar aplicação

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔧 CORRIGIR PERMISSÕES DO DOCKER" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$Region = "sa-east-1"
# ⚠️ ALTERE: Coloque o Instance ID da sua instância EC2
$InstanceId = ""  # Exemplo: "i-00082f6aad226fbda"

Write-Host "📋 Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔧 Corrigindo permissões do Docker..." -ForegroundColor Cyan
Write-Host "⏳ Isso pode levar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "echo '🔧 Corrigindo permissões do Docker...'",
        "echo ''",
        "echo '1️⃣ Adicionando usuário ubuntu ao grupo docker...'",
        "sudo usermod -aG docker ubuntu || true",
        "echo '✅ Usuário adicionado ao grupo docker'",
        "echo ''",
        "echo '2️⃣ Verificando se grupo docker existe...'",
        "getent group docker || echo '⚠️ Grupo docker não encontrado'",
        "echo ''",
        "echo '3️⃣ Corrigindo permissões do socket Docker...'",
        "sudo chmod 666 /var/run/docker.sock 2>/dev/null || sudo chown root:docker /var/run/docker.sock || true",
        "echo '✅ Permissões corrigidas'",
        "echo ''",
        "echo '4️⃣ Verificando se Docker está rodando...'",
        "sudo systemctl status docker --no-pager | head -5 || echo '⚠️ Docker não está rodando'",
        "echo ''",
        "echo '5️⃣ Testando acesso ao Docker (com sudo)...'",
        "sudo docker ps > /dev/null 2>&1 && echo '✅ Docker está acessível com sudo' || echo '❌ Docker não está acessível'",
        "echo ''",
        "echo '6️⃣ Mudando para diretório web-site...'",
        "cd /opt/smartshow/smartshow/web-site || {",
        "  echo '❌ Erro: Diretório web-site não encontrado!'",
        "  echo '📋 Verificando estrutura:'",
        "  ls -la /opt/smartshow/smartshow/ 2>/dev/null || echo 'Diretório não existe'",
        "  exit 1",
        "}",
        # Suppress PSScriptAnalyzer warning: pwd is used in bash string, not PowerShell
        # pwd será executado em bash na EC2, não em PowerShell
        [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingCmdletAliases', '')]
        "echo '✅ Diretório: '`$(pwd)",
        "echo ''",
        "echo '7️⃣ Parando containers existentes (com sudo)...'",
        "sudo docker-compose down || true",
        "echo ''",
        "echo '8️⃣ Construindo containers (com sudo)...'",
        "sudo docker-compose build --no-cache 2>&1 | tail -20 || sudo docker-compose build 2>&1 | tail -20",
        "echo ''",
        "echo '9️⃣ Iniciando containers (com sudo)...'",
        "sudo docker-compose up -d",
        "echo ''",
        "echo '⏳ Aguardando 15 segundos para containers iniciarem...'",
        "sleep 15",
        "echo ''",
        "echo '📊 Status dos containers:'",
        "sudo docker-compose ps",
        "echo ''",
        "echo '🌐 Testando API:'",
        "curl -f http://localhost:3000/api/health && echo '✅ API está respondendo!' || echo '⚠️ API ainda não está respondendo'",
        "echo ''",
        "echo '✅ Processo concluído!'",
        "echo ''",
        "echo '💡 Para usar Docker sem sudo no futuro, faça logout e login novamente, ou execute:'",
        "echo '   newgrp docker'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

if ($commandId) {
    Write-Host "✅ Comando enviado!" -ForegroundColor Green
    Write-Host "   Command ID: $commandId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⏳ Aguardando execução (60 segundos)..." -ForegroundColor Yellow
    Write-Host "   (Isso pode levar alguns minutos se os containers precisarem ser construídos)" -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds 60
    
    Write-Host "📋 Resultado:" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --query "StandardOutputContent" `
        --output text
    
    $errorOutput = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --query "StandardErrorContent" `
        --output text
    
    Write-Host $output -ForegroundColor White
    
    if ($errorOutput) {
        Write-Host ""
        Write-Host "⚠️ Erros:" -ForegroundColor Yellow
        Write-Host $errorOutput -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🌐 URLs para testar:" -ForegroundColor Cyan
    Write-Host "   - http://54.232.140.177" -ForegroundColor White
    Write-Host "   - http://54.232.140.177:3000/api/health" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Se ainda tiver problemas de permissão, use 'sudo' antes dos comandos docker-compose" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Erro ao enviar comando" -ForegroundColor Red
    Write-Host "   Verifique se Systems Manager está habilitado na instância" -ForegroundColor Yellow
}

Write-Host ""




