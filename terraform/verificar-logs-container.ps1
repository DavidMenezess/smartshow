# ========================================
# VERIFICAR LOGS DO CONTAINER QUE ESTÁ REINICIANDO
# ========================================

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔍 VERIFICAR LOGS DO CONTAINER" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$Region = "sa-east-1"
# ⚠️ ALTERE: Coloque o Instance ID da sua instância EC2
$InstanceId = ""  # Exemplo: "i-00082f6aad226fbda"

Write-Host "📋 Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔍 Verificando logs do container que está reiniciando..." -ForegroundColor Cyan
Write-Host ""

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "cd /opt/smartshow/smartshow/web-site",
        "echo '📊 Status dos containers:'",
        "sudo docker-compose ps",
        "echo ''",
        "echo '📋 Últimos 100 logs do container (mostra o erro):'",
        "sudo docker-compose logs --tail=100 smartshow-api",
        "echo ''",
        "echo '📋 Logs completos (últimas 50 linhas):'",
        "sudo docker logs smartshow-api --tail=50 2>&1 || echo 'Erro ao obter logs'",
        "echo ''",
        "echo '🔍 Verificando se diretórios existem:'",
        "ls -la api/data 2>/dev/null || echo '❌ api/data não existe'",
        "ls -la api/output 2>/dev/null || echo '❌ api/output não existe'",
        "ls -la api/uploads 2>/dev/null || echo '❌ api/uploads não existe'",
        "echo ''",
        "echo '🔍 Verificando Dockerfile:'",
        "test -f Dockerfile && echo '✅ Dockerfile existe' || echo '❌ Dockerfile não existe'",
        "echo ''",
        "echo '🔍 Verificando package.json:'",
        "test -f api/package.json && echo '✅ package.json existe' || echo '❌ package.json não existe'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

if ($commandId) {
    Write-Host "✅ Comando enviado!" -ForegroundColor Green
    Write-Host "   Command ID: $commandId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⏳ Aguardando execução (10 segundos)..." -ForegroundColor Yellow
    Write-Host ""
    
    Start-Sleep -Seconds 10
    
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
    Write-Host "💡 Analise os logs acima para identificar o erro." -ForegroundColor Yellow
    Write-Host "   O container está reiniciando porque encontra um erro ao iniciar." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Erro ao enviar comando" -ForegroundColor Red
}

Write-Host ""




