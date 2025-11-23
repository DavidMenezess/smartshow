# ========================================
# CORRIGIR ERRO DO BCRYPT
# ========================================
# Script para atualizar código e reconstruir container

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔧 CORRIGIR ERRO DO BCRYPT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$Region = "sa-east-1"
# ⚠️ ALTERE: Coloque o Instance ID da sua instância EC2
$InstanceId = ""  # Exemplo: "i-00082f6aad226fbda"

Write-Host "📋 Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔄 Atualizando código e reconstruindo container..." -ForegroundColor Cyan
Write-Host "⏳ Isso pode levar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "cd /opt/smartshow/smartshow/web-site",
        "echo '📥 Atualizando código do repositório...'",
        "sudo git fetch origin",
        "sudo git reset --hard origin/main",
        "sudo git pull origin main || true",
        "echo '✅ Código atualizado'",
        "echo ''",
        "echo '🛑 Parando containers...'",
        "sudo docker-compose down",
        "echo ''",
        "echo '🗑️ Removendo container e imagem antiga...'",
        "sudo docker-compose rm -f smartshow-api || true",
        "sudo docker rmi web-site-smartshow-api || true",
        "echo ''",
        "echo '🏗️ Construindo nova imagem (isso pode levar alguns minutos)...'",
        "sudo docker-compose build --no-cache",
        "echo ''",
        "echo '🚀 Iniciando containers...'",
        "sudo docker-compose up -d",
        "echo ''",
        "echo '⏳ Aguardando 20 segundos para containers iniciarem...'",
        "sleep 20",
        "echo ''",
        "echo '📊 Status dos containers:'",
        "sudo docker-compose ps",
        "echo ''",
        "echo '📋 Últimos logs (verificando se iniciou corretamente):'",
        "sudo docker-compose logs --tail=30 smartshow-api",
        "echo ''",
        "echo '🌐 Testando API:'",
        "curl -f http://localhost:3000/api/health && echo '✅ API está respondendo!' || echo '⚠️ API ainda não está respondendo (aguarde mais alguns segundos)'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

if ($commandId) {
    Write-Host "✅ Comando enviado!" -ForegroundColor Green
    Write-Host "   Command ID: $commandId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⏳ Aguardando execução (90 segundos)..." -ForegroundColor Yellow
    Write-Host "   (Isso pode levar alguns minutos para construir a imagem)" -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds 90
    
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
    Write-Host "💡 Se a API não estiver respondendo, aguarde mais 1-2 minutos e verifique novamente." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Erro ao enviar comando" -ForegroundColor Red
}

Write-Host ""




