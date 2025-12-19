# ========================================
# SCRIPT PARA TESTAR E CORRIGIR SSH
# ========================================

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔐 DIAGNÓSTICO DE SSH" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$KeyPath = "C:\Users\User\Documents\AWS\SSH\smartshow.pem"
$EC2IP = "56.126.14.115"
$EC2User = "ubuntu"
$Region = "sa-east-1"

# 1. Verificar se a chave existe
Write-Host "1️⃣ Verificando chave SSH..." -ForegroundColor Yellow
if (Test-Path $KeyPath) {
    Write-Host "✅ Chave encontrada: $KeyPath" -ForegroundColor Green
    $keyInfo = Get-Item $KeyPath
    Write-Host "   Tamanho: $($keyInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "   Última modificação: $($keyInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "❌ Chave NÃO encontrada em: $KeyPath" -ForegroundColor Red
    Write-Host "   Verifique o caminho e tente novamente." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Verificar formato da chave
Write-Host "2️⃣ Verificando formato da chave..." -ForegroundColor Yellow
$firstLine = Get-Content $KeyPath -First 1
if ($firstLine -match "BEGIN.*PRIVATE KEY") {
    Write-Host "✅ Formato da chave parece correto" -ForegroundColor Green
    Write-Host "   Primeira linha: $firstLine" -ForegroundColor Gray
} else {
    Write-Host "⚠️ Formato da chave pode estar incorreto" -ForegroundColor Yellow
    Write-Host "   Primeira linha: $firstLine" -ForegroundColor Gray
}
Write-Host ""

# 3. Verificar se SSH Agent está rodando
Write-Host "3️⃣ Verificando SSH Agent..." -ForegroundColor Yellow
$sshAgent = Get-Service ssh-agent -ErrorAction SilentlyContinue
if ($sshAgent -and $sshAgent.Status -eq "Running") {
    Write-Host "✅ SSH Agent está rodando" -ForegroundColor Green
} else {
    Write-Host "⚠️ SSH Agent não está rodando" -ForegroundColor Yellow
    Write-Host "   Tentando iniciar..." -ForegroundColor Gray
    try {
        Start-Service ssh-agent -ErrorAction Stop
        Write-Host "✅ SSH Agent iniciado" -ForegroundColor Green
    } catch {
        Write-Host "❌ Não foi possível iniciar SSH Agent" -ForegroundColor Red
        Write-Host "   Erro: $_" -ForegroundColor Gray
    }
}
Write-Host ""

# 4. Tentar adicionar chave ao SSH Agent
Write-Host "4️⃣ Adicionando chave ao SSH Agent..." -ForegroundColor Yellow
try {
    ssh-add $KeyPath 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Chave adicionada ao SSH Agent" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Não foi possível adicionar chave ao SSH Agent" -ForegroundColor Yellow
        Write-Host "   Continuando sem SSH Agent..." -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Erro ao adicionar chave: $_" -ForegroundColor Yellow
}
Write-Host ""

# 5. Verificar instância EC2
Write-Host "5️⃣ Verificando instância EC2..." -ForegroundColor Yellow
try {
    $instance = aws ec2 describe-instances `
        --region $Region `
        --filters "Name=ip-address,Values=$EC2IP" `
        --query "Reservations[*].Instances[*].[InstanceId,State.Name,KeyName]" `
        --output json 2>&1 | ConvertFrom-Json
    
    if ($instance -and $instance.Count -gt 0) {
        $instanceId = $instance[0][0]
        $state = $instance[0][1]
        $keyName = $instance[0][2]
        
        Write-Host "✅ Instância encontrada:" -ForegroundColor Green
        Write-Host "   Instance ID: $instanceId" -ForegroundColor Gray
        Write-Host "   Estado: $state" -ForegroundColor Gray
        Write-Host "   Chave SSH: $keyName" -ForegroundColor Gray
        
        if ($keyName -ne "smartshow") {
            Write-Host "⚠️ ATENÇÃO: A instância usa a chave '$keyName', não 'smartshow'!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Instância não encontrada com IP $EC2IP" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ Não foi possível verificar instância (AWS CLI pode não estar configurado)" -ForegroundColor Yellow
    Write-Host "   Erro: $_" -ForegroundColor Gray
}
Write-Host ""

# 6. Testar conexão SSH (modo verbose)
Write-Host "6️⃣ Testando conexão SSH..." -ForegroundColor Yellow
Write-Host "   Comando: ssh -i $KeyPath $EC2User@$EC2IP" -ForegroundColor Gray
Write-Host ""

Write-Host "Tentando conectar (pode demorar alguns segundos)..." -ForegroundColor Cyan
Write-Host ""

# Tentar conexão com timeout
$sshTest = Start-Process -FilePath "ssh" `
    -ArgumentList "-o", "ConnectTimeout=10", "-o", "StrictHostKeyChecking=no", "-i", $KeyPath, "$EC2User@$EC2IP", "echo 'Conexão bem-sucedida!'" `
    -NoNewWindow -Wait -PassThru -RedirectStandardOutput "ssh_output.txt" -RedirectStandardError "ssh_error.txt"

if ($sshTest.ExitCode -eq 0) {
    Write-Host "✅ Conexão SSH bem-sucedida!" -ForegroundColor Green
    Get-Content "ssh_output.txt" | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "❌ Falha na conexão SSH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erros:" -ForegroundColor Yellow
    Get-Content "ssh_error.txt" | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Saída:" -ForegroundColor Yellow
    Get-Content "ssh_output.txt" | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}
Write-Host ""

# Limpar arquivos temporários
Remove-Item "ssh_output.txt" -ErrorAction SilentlyContinue
Remove-Item "ssh_error.txt" -ErrorAction SilentlyContinue

# 7. Recomendações
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "💡 RECOMENDAÇÕES" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($sshTest.ExitCode -ne 0) {
    Write-Host "Se a conexão falhou, tente:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Verificar se a chave está correta na AWS Console" -ForegroundColor White
    Write-Host "2. Usar SSH Agent:" -ForegroundColor White
    Write-Host "   ssh-add $KeyPath" -ForegroundColor Gray
    Write-Host "   ssh $EC2User@$EC2IP" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Testar com verbose para mais detalhes:" -ForegroundColor White
    Write-Host "   ssh -vvv -i $KeyPath $EC2User@$EC2IP" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Verificar Security Group (porta 22 deve estar aberta)" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Usar AWS Systems Manager como alternativa:" -ForegroundColor White
    Write-Host "   aws ssm start-session --target <INSTANCE_ID> --region $Region" -ForegroundColor Gray
} else {
    Write-Host "✅ Conexão SSH está funcionando!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para conectar, use:" -ForegroundColor White
    Write-Host "   ssh -i $KeyPath $EC2User@$EC2IP" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ou se a chave estiver no SSH Agent:" -ForegroundColor White
    Write-Host "   ssh $EC2User@$EC2IP" -ForegroundColor Gray
}

Write-Host ""
































