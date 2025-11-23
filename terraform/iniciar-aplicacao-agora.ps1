# ========================================
# INICIAR APLICAÇÃO AGORA
# ========================================
# Script simples para iniciar a aplicação imediatamente

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 INICIAR APLICAÇÃO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$Region = "sa-east-1"
# ⚠️ ALTERE: Coloque o Instance ID da sua instância EC2
$InstanceId = ""  # Exemplo: "i-00082f6aad226fbda"

Write-Host "📋 Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

Write-Host "🚀 Iniciando aplicação..." -ForegroundColor Cyan
Write-Host "⏳ Isso pode levar 2-3 minutos..." -ForegroundColor Yellow
Write-Host ""

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "echo '📂 Mudando para diretório web-site...'",
        "cd /opt/smartshow/smartshow/web-site || {",
        "  echo '❌ Erro: Diretório web-site não encontrado!'",
        "  echo '📋 Verificando estrutura:'",
        "  ls -la /opt/smartshow/smartshow/ 2>/dev/null || echo 'Diretório não existe'",
        "  exit 1",
        "}",
        # pwd será executado em bash na EC2, não em PowerShell  
        "echo '✅ Diretório: '`$(pwd)",
        "echo ''",
        "echo '📋 Verificando docker-compose.yml...'",
        "if [ ! -f docker-compose.yml ]; then",
        "  echo '❌ docker-compose.yml não encontrado!'",
        "  echo '📋 Arquivos no diretório:'",
        "  ls -la",
        "  exit 1",
        "fi",
        "echo '✅ docker-compose.yml encontrado'",
        "echo ''",
        "echo '🛑 Parando containers existentes...'",
        "docker-compose down || true",
        "echo ''",
        "echo '🏗️ Construindo containers (isso pode levar alguns minutos)...'",
        "docker-compose build --no-cache 2>&1 || docker-compose build 2>&1",
        "echo ''",
        "echo '🚀 Iniciando containers...'",
        "docker-compose up -d",
        "echo ''",
        "echo '⏳ Aguardando 15 segundos para containers iniciarem...'",
        "sleep 15",
        "echo ''",
        "echo '📊 Status dos containers:'",
        "docker-compose ps",
        "echo ''",
        "echo '🌐 Testando API:'",
        "curl -f http://localhost:3000/api/health && echo '✅ API está respondendo!' || echo '⚠️ API ainda não está respondendo (aguarde mais alguns segundos)'",
        "echo ''",
        "echo '✅ Processo concluído!'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

if ($commandId) {
    Write-Host "✅ Comando enviado!" -ForegroundColor Green
    Write-Host "   Command ID: $commandId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⏳ Aguardando execução (45 segundos)..." -ForegroundColor Yellow
    Write-Host "   (Isso pode levar alguns minutos se os containers precisarem ser construídos)" -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds 45
    
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
    Write-Host "💡 Se a API não estiver respondendo, aguarde mais 1-2 minutos e tente novamente." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Erro ao enviar comando" -ForegroundColor Red
    Write-Host "   Verifique se Systems Manager está habilitado na instância" -ForegroundColor Yellow
}

Write-Host ""




