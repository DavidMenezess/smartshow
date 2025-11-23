# ========================================
# VERIFICAR APLICAÇÃO DIRETAMENTE
# ========================================
# Script para verificar status da aplicação usando Instance ID

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔍 VERIFICAR APLICAÇÃO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$Region = "sa-east-1"
# ⚠️ ALTERE: Coloque o Instance ID da sua instância EC2
$InstanceId = ""  # Exemplo: "i-00082f6aad226fbda"

Write-Host "📋 Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "🌐 Região: $Region" -ForegroundColor Yellow
Write-Host ""

# Verificar se instância existe e está running
Write-Host "1️⃣ Verificando instância..." -ForegroundColor Yellow
try {
    $instanceInfo = aws ec2 describe-instances `
        --region $Region `
        --instance-ids $InstanceId `
        --query "Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress]" `
        --output json 2>&1 | ConvertFrom-Json
    
    if ($instanceInfo -and $instanceInfo.Count -ge 2) {
        $state = $instanceInfo[1]
        $publicIp = $instanceInfo[2]
        
        Write-Host "✅ Instância encontrada!" -ForegroundColor Green
        Write-Host "   Estado: $state" -ForegroundColor Gray
        Write-Host "   IP Público: $publicIp" -ForegroundColor Gray
        
        if ($state -ne "running") {
            Write-Host "⚠️ Instância não está em estado 'running'!" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "❌ Instância não encontrada" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro ao verificar instância: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verificar status da aplicação
Write-Host "2️⃣ Verificando status da aplicação..." -ForegroundColor Yellow
Write-Host ""

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "echo '📊 Status dos containers:'",
        "cd /opt/smartshow/smartshow/web-site 2>/dev/null || echo '❌ Diretório não encontrado'",
        "docker-compose ps 2>/dev/null || echo '❌ docker-compose não encontrado ou erro'",
        "echo ''",
        "echo '🌐 Testando API:'",
        "curl -f http://localhost:3000/api/health 2>/dev/null && echo '✅ API OK!' || echo '❌ API não está respondendo'",
        "echo ''",
        "echo '📋 Últimas 30 linhas dos logs:'",
        "docker-compose logs --tail=30 2>/dev/null || echo '❌ Erro ao obter logs'",
        "echo ''",
        "echo '📋 Verificando user-data.log:'",
        "tail -20 /var/log/user-data.log 2>/dev/null || echo '❌ Log não encontrado'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

if ($commandId) {
    Write-Host "⏳ Aguardando execução do comando (10 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "📋 Resultado:" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    $result = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region
    
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
    Write-Host "   - http://$publicIp" -ForegroundColor White
    Write-Host "   - http://$publicIp:3000/api/health" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Erro ao executar comando" -ForegroundColor Red
    Write-Host "   Verifique se Systems Manager está habilitado na instância" -ForegroundColor Yellow
}

Write-Host ""




