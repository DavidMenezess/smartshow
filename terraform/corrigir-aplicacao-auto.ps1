# ========================================
# CORRIGIR APLICAÇÃO PARA INICIAR AUTOMATICAMENTE
# ========================================

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔧 CORRIGIR INICIALIZAÇÃO AUTOMÁTICA" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$Region = "sa-east-1"
# ⚠️ ALTERE: Coloque o Instance ID da sua instância EC2
$InstanceId = ""  # Exemplo: "i-00082f6aad226fbda"

Write-Host "📋 Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

# Verificar se instância está running
Write-Host "1️⃣ Verificando instância..." -ForegroundColor Yellow
try {
    $state = aws ec2 describe-instances `
        --region $Region `
        --instance-ids $InstanceId `
        --query "Reservations[0].Instances[0].State.Name" `
        --output text
    
    if ($state -ne "running") {
        Write-Host "❌ Instância não está em estado 'running'!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Instância está running" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao verificar instância: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verificar estrutura de diretórios
Write-Host "2️⃣ Verificando estrutura de diretórios..." -ForegroundColor Yellow
$checkDirs = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "echo '📁 Verificando diretórios:'",
        "ls -la /opt/smartshow/ 2>/dev/null || echo '❌ /opt/smartshow não existe'",
        "ls -la /opt/smartshow/smartshow/ 2>/dev/null || echo '❌ /opt/smartshow/smartshow não existe'",
        "ls -la /opt/smartshow/smartshow/web-site/ 2>/dev/null || echo '❌ /opt/smartshow/smartshow/web-site não existe'",
        "test -f /opt/smartshow/smartshow/web-site/docker-compose.yml && echo '✅ docker-compose.yml existe' || echo '❌ docker-compose.yml não existe'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

Start-Sleep -Seconds 5
$dirResult = aws ssm get-command-invocation `
    --command-id $checkDirs `
    --instance-id $InstanceId `
    --region $Region `
    --query "StandardOutputContent" `
    --output text

Write-Host $dirResult -ForegroundColor White
Write-Host ""

# Verificar status dos containers
Write-Host "3️⃣ Verificando containers Docker..." -ForegroundColor Yellow
$checkContainers = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "cd /opt/smartshow/smartshow/web-site 2>/dev/null || cd /opt/smartshow/smartshow/web-site || echo '❌ Não foi possível acessar diretório web-site'",
        "docker-compose ps 2>/dev/null || echo '❌ Erro ao executar docker-compose ps'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

Start-Sleep -Seconds 5
$containerResult = aws ssm get-command-invocation `
    --command-id $checkContainers `
    --instance-id $InstanceId `
    --region $Region `
    --query "StandardOutputContent" `
    --output text

Write-Host $containerResult -ForegroundColor White
Write-Host ""

# Verificar logs do user-data
Write-Host "4️⃣ Verificando logs do user-data..." -ForegroundColor Yellow
$checkLogs = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands=@(
        "echo '📋 Últimas 50 linhas do user-data.log:'",
        "tail -50 /var/log/user-data.log 2>/dev/null || echo '❌ Log não encontrado'"
    ) `
    --region $Region `
    --query "Command.CommandId" `
    --output text

Start-Sleep -Seconds 3
$logsResult = aws ssm get-command-invocation `
    --command-id $checkLogs `
    --instance-id $InstanceId `
    --region $Region `
    --query "StandardOutputContent" `
    --output text

Write-Host $logsResult -ForegroundColor White
Write-Host ""

# Menu de ações
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔧 AÇÕES DISPONÍVEIS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Iniciar aplicação manualmente" -ForegroundColor White
Write-Host "2. Reexecutar user-data.sh" -ForegroundColor White
Write-Host "3. Verificar e corrigir estrutura" -ForegroundColor White
Write-Host "4. Reiniciar containers" -ForegroundColor White
Write-Host "0. Sair" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Escolha uma opção"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Iniciando aplicação..." -ForegroundColor Cyan
        $commandId = aws ssm send-command `
            --instance-ids $InstanceId `
            --document-name "AWS-RunShellScript" `
            --parameters commands=@(
                "cd /opt/smartshow/smartshow/web-site",
                "echo '🛑 Parando containers existentes...'",
                "docker-compose down || true",
                "echo '🏗️ Construindo containers...'",
                "docker-compose build --no-cache || docker-compose build",
                "echo '🚀 Iniciando containers...'",
                "docker-compose up -d",
                "echo '⏳ Aguardando 10 segundos...'",
                "sleep 10",
                "echo '📊 Status dos containers:'",
                "docker-compose ps",
                "echo ''",
                "echo '🌐 Testando API:'",
                "curl -f http://localhost:3000/api/health && echo '✅ API OK!' || echo '❌ API não está respondendo'"
            ) `
            --region $Region `
            --query "Command.CommandId" `
            --output text
        
        Write-Host "⏳ Aguardando execução (30 segundos)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        $result = aws ssm get-command-invocation `
            --command-id $commandId `
            --instance-id $InstanceId `
            --region $Region `
            --query "StandardOutputContent" `
            --output text
        
        Write-Host ""
        Write-Host "📋 Resultado:" -ForegroundColor Cyan
        Write-Host $result -ForegroundColor White
    }
    
    "2" {
        Write-Host ""
        Write-Host "⚠️ ATENÇÃO: Reexecutar user-data requer recriar a instância!" -ForegroundColor Yellow
        Write-Host "   Isso vai apagar tudo e recriar do zero." -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Deseja continuar? (s/n)"
        
        if ($confirm -eq "s") {
            Write-Host ""
            Write-Host "🔄 Recriando instância..." -ForegroundColor Cyan
            Write-Host "   Execute no diretório terraform:" -ForegroundColor Yellow
            Write-Host "   terraform destroy -auto-approve" -ForegroundColor Gray
            Write-Host "   terraform apply -auto-approve" -ForegroundColor Gray
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔧 Verificando e corrigindo estrutura..." -ForegroundColor Cyan
        $commandId = aws ssm send-command `
            --instance-ids $InstanceId `
            --document-name "AWS-RunShellScript" `
            --parameters commands=@(
                "echo '📁 Verificando estrutura...'",
                "mkdir -p /opt/smartshow/smartshow/web-site",
                "cd /opt/smartshow/smartshow/web-site",
                "if [ ! -f docker-compose.yml ]; then",
                "  echo '❌ docker-compose.yml não encontrado!'",
                "  echo '📋 Conteúdo do diretório:'",
                "  ls -la",
                "  echo ''",
                "  echo '📋 Conteúdo de /opt/smartshow/smartshow:'",
                "  ls -la /opt/smartshow/smartshow/",
                "else",
                "  echo '✅ docker-compose.yml encontrado!'",
                "fi",
                "echo ''",
                "echo '📁 Criando diretórios necessários...'",
                "mkdir -p api/data api/output api/uploads",
                "chmod -R 755 api/",
                "chown -R ubuntu:ubuntu /opt/smartshow || true"
            ) `
            --region $Region `
            --query "Command.CommandId" `
            --output text
        
        Start-Sleep -Seconds 5
        $result = aws ssm get-command-invocation `
            --command-id $commandId `
            --instance-id $InstanceId `
            --region $Region `
            --query "StandardOutputContent" `
            --output text
        
        Write-Host $result -ForegroundColor White
    }
    
    "4" {
        Write-Host ""
        Write-Host "🔄 Reiniciando containers..." -ForegroundColor Cyan
        $commandId = aws ssm send-command `
            --instance-ids $InstanceId `
            --document-name "AWS-RunShellScript" `
            --parameters commands=@(
                "cd /opt/smartshow/smartshow/web-site",
                "docker-compose down",
                "docker-compose up -d",
                "sleep 10",
                "docker-compose ps"
            ) `
            --region $Region `
            --query "Command.CommandId" `
            --output text
        
        Start-Sleep -Seconds 15
        $result = aws ssm get-command-invocation `
            --command-id $commandId `
            --instance-id $InstanceId `
            --region $Region `
            --query "StandardOutputContent" `
            --output text
        
        Write-Host $result -ForegroundColor White
    }
    
    "0" {
        Write-Host "Saindo..." -ForegroundColor Yellow
        exit 0
    }
    
    default {
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
    }
}

Write-Host ""




