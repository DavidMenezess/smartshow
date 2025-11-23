# ========================================
# SCRIPT PARA ACESSAR INSTÂNCIA EC2
# ========================================
# Este script tenta múltiplas formas de acesso

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔐 ACESSO À INSTÂNCIA EC2" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$Region = "sa-east-1"
$KeyPath = "C:\Users\User\Documents\AWS\SSH\smartshow.pem"

# 1. Obter IP da instância
Write-Host "1️⃣ Obtendo IP da instância..." -ForegroundColor Yellow
try {
    Push-Location "$PSScriptRoot"
    $publicIp = terraform output -raw public_ip 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Não foi possível obter IP via Terraform" -ForegroundColor Yellow
        Write-Host "   Digite o IP manualmente: " -NoNewline -ForegroundColor Yellow
        $publicIp = Read-Host
    }
    Pop-Location
    Write-Host "✅ IP: $publicIp" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao obter IP: $_" -ForegroundColor Red
    Write-Host "   Digite o IP manualmente: " -NoNewline -ForegroundColor Yellow
    $publicIp = Read-Host
}
Write-Host ""

# 2. Obter Instance ID
Write-Host "2️⃣ Obtendo Instance ID..." -ForegroundColor Yellow
$instanceId = $null
$state = $null
$keyName = $null

# Tentar múltiplos métodos de busca
try {
    # Método 1: Buscar por IP público (Elastic IP)
    Write-Host "   Tentando buscar por IP público..." -ForegroundColor Gray
    $instanceInfo = aws ec2 describe-instances `
        --region $Region `
        --filters "Name=ip-address,Values=$publicIp" `
        --query "Reservations[0].Instances[0].[InstanceId,State.Name,KeyName]" `
        --output json 2>&1 | ConvertFrom-Json
    
    if (-not $instanceInfo -or $instanceInfo.Count -lt 2) {
        # Método 2: Buscar por public-ip-address
        Write-Host "   Tentando buscar por public-ip-address..." -ForegroundColor Gray
        $instanceInfo = aws ec2 describe-instances `
            --region $Region `
            --filters "Name=network-interface.addresses.association.public-ip,Values=$publicIp" `
            --query "Reservations[0].Instances[0].[InstanceId,State.Name,KeyName]" `
            --output json 2>&1 | ConvertFrom-Json
    }
    
    if (-not $instanceInfo -or $instanceInfo.Count -lt 2) {
        # Método 3: Buscar por tag Name
        Write-Host "   Tentando buscar por tag Name..." -ForegroundColor Gray
        $instanceInfo = aws ec2 describe-instances `
            --region $Region `
            --filters "Name=tag:Name,Values=smartshow-prod" "Name=instance-state-name,Values=running" `
            --query "Reservations[0].Instances[0].[InstanceId,State.Name,KeyName]" `
            --output json 2>&1 | ConvertFrom-Json
    }
    
    if ($instanceInfo -and $instanceInfo.Count -ge 2) {
        $instanceId = $instanceInfo[0]
        $state = $instanceInfo[1]
        $keyName = $instanceInfo[2]
        
        Write-Host "✅ Instance ID: $instanceId" -ForegroundColor Green
        Write-Host "   Estado: $state" -ForegroundColor Gray
        if ($keyName) {
            Write-Host "   Chave SSH: $keyName" -ForegroundColor Gray
        }
        
        if ($state -ne "running") {
            Write-Host "⚠️ ATENÇÃO: Instância não está em estado 'running'!" -ForegroundColor Yellow
            Write-Host "   Aguarde a instância iniciar antes de continuar." -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "⚠️ Instância não encontrada automaticamente com IP $publicIp" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Você pode:" -ForegroundColor Cyan
        Write-Host "   1. Inserir o Instance ID manualmente" -ForegroundColor White
        Write-Host "   2. Buscar todas as instâncias running" -ForegroundColor White
        Write-Host ""
        Write-Host "   Ou digite o Instance ID diretamente (ex: i-0123456789abcdef0)" -ForegroundColor Yellow
        Write-Host ""
        $opcao = Read-Host "Escolha uma opção (1, 2 ou digite o Instance ID)"
        
        # Se o usuário digitou um Instance ID diretamente (começa com i-)
        if ($opcao -match "^i-[a-z0-9]+$") {
            $instanceId = $opcao
            Write-Host "✅ Instance ID detectado: $instanceId" -ForegroundColor Green
            # Verificar se a instância existe
            try {
                $instanceInfo = aws ec2 describe-instances `
                    --region $Region `
                    --instance-ids $instanceId `
                    --query "Reservations[0].Instances[0].[InstanceId,State.Name,KeyName]" `
                    --output json 2>&1 | ConvertFrom-Json
                
                if ($instanceInfo -and $instanceInfo.Count -ge 2) {
                    $state = $instanceInfo[1]
                    $keyName = $instanceInfo[2]
                    Write-Host "   Estado: $state" -ForegroundColor Gray
                    if ($keyName) {
                        Write-Host "   Chave SSH: $keyName" -ForegroundColor Gray
                    }
                } else {
                    Write-Host "❌ Instância não encontrada ou erro ao acessar" -ForegroundColor Red
                    exit 1
                }
            } catch {
                Write-Host "❌ Erro ao verificar instância: $_" -ForegroundColor Red
                exit 1
            }
        } elseif ($opcao -eq "1") {
            Write-Host ""
            Write-Host "   Instance ID (ex: i-0123456789abcdef0): " -NoNewline -ForegroundColor Yellow
            $instanceId = Read-Host
            if ($instanceId) {
                # Verificar se a instância existe e obter estado
                $instanceInfo = aws ec2 describe-instances `
                    --region $Region `
                    --instance-ids $instanceId `
                    --query "Reservations[0].Instances[0].[InstanceId,State.Name,KeyName]" `
                    --output json 2>&1 | ConvertFrom-Json
                
                if ($instanceInfo -and $instanceInfo.Count -ge 2) {
                    $state = $instanceInfo[1]
                    $keyName = $instanceInfo[2]
                    Write-Host "✅ Instância encontrada!" -ForegroundColor Green
                    Write-Host "   Estado: $state" -ForegroundColor Gray
                } else {
                    Write-Host "❌ Instância não encontrada ou erro ao acessar" -ForegroundColor Red
                    exit 1
                }
            } else {
                Write-Host "❌ Instance ID não fornecido" -ForegroundColor Red
                exit 1
            }
        } elseif ($opcao -eq "2") {
            Write-Host ""
            Write-Host "📋 Listando instâncias running..." -ForegroundColor Cyan
            $instances = aws ec2 describe-instances `
                --region $Region `
                --filters "Name=instance-state-name,Values=running" `
                --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],PublicIpAddress,State.Name]" `
                --output table
            
            Write-Host $instances -ForegroundColor White
            Write-Host ""
            Write-Host "   Instance ID: " -NoNewline -ForegroundColor Yellow
            $instanceId = Read-Host
            if ($instanceId) {
                $instanceInfo = aws ec2 describe-instances `
                    --region $Region `
                    --instance-ids $instanceId `
                    --query "Reservations[0].Instances[0].[InstanceId,State.Name,KeyName]" `
                    --output json 2>&1 | ConvertFrom-Json
                
                if ($instanceInfo -and $instanceInfo.Count -ge 2) {
                    $state = $instanceInfo[1]
                    $keyName = $instanceInfo[2]
                }
            }
        } else {
            Write-Host "❌ Opção inválida" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "⚠️ Erro ao buscar Instance ID automaticamente: $_" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Insira o Instance ID manualmente:" -ForegroundColor Cyan
    Write-Host "   Instance ID (ex: i-00082f6aad226fbda): " -NoNewline -ForegroundColor Yellow
    $instanceId = Read-Host
    
    if (-not $instanceId) {
        Write-Host "❌ Instance ID não fornecido" -ForegroundColor Red
        Write-Host "   Verifique o AWS Console e tente novamente." -ForegroundColor Yellow
        exit 1
    }
    
    # Verificar instância
    try {
        $instanceInfo = aws ec2 describe-instances `
            --region $Region `
            --instance-ids $instanceId `
            --query "Reservations[0].Instances[0].[InstanceId,State.Name,KeyName]" `
            --output json 2>&1 | ConvertFrom-Json
        
        if ($instanceInfo -and $instanceInfo.Count -ge 2) {
            $state = $instanceInfo[1]
            $keyName = $instanceInfo[2]
            Write-Host "✅ Instância encontrada!" -ForegroundColor Green
            Write-Host "   Estado: $state" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Erro ao verificar instância: $_" -ForegroundColor Red
        exit 1
    }
}

if (-not $instanceId) {
    Write-Host "❌ Não foi possível obter Instance ID" -ForegroundColor Red
    Write-Host "   Verifique o AWS Console e tente novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 3. Menu de opções
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📋 OPÇÕES DE ACESSO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. AWS Systems Manager (Recomendado - não precisa de SSH)" -ForegroundColor White
Write-Host "2. SSH tradicional (requer chave .pem)" -ForegroundColor White
Write-Host "3. Verificar status da aplicação (via Systems Manager)" -ForegroundColor White
Write-Host "4. Ver logs do user-data (via Systems Manager)" -ForegroundColor White
Write-Host "5. Reiniciar aplicação (via Systems Manager)" -ForegroundColor White
Write-Host "0. Sair" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Escolha uma opção"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "🔐 Conectando via AWS Systems Manager..." -ForegroundColor Cyan
        Write-Host "   Instance ID: $instanceId" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 Dica: Para sair da sessão, digite 'exit' ou pressione Ctrl+D" -ForegroundColor Yellow
        Write-Host ""
        
        # Verificar se plugin está instalado
        $pluginInstalled = Get-Command aws-session-manager-plugin -ErrorAction SilentlyContinue
        if (-not $pluginInstalled) {
            Write-Host "⚠️ AWS Session Manager Plugin não encontrado!" -ForegroundColor Yellow
            Write-Host "   Baixe em: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "   Ou instale via Chocolatey:" -ForegroundColor Yellow
            Write-Host "   choco install aws-session-manager-plugin" -ForegroundColor Gray
            Write-Host ""
            $continuar = Read-Host "Deseja tentar mesmo assim? (s/n)"
            if ($continuar -ne "s") {
                exit 0
            }
        }
        
        aws ssm start-session --target $instanceId --region $Region
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔐 Conectando via SSH..." -ForegroundColor Cyan
        Write-Host "   IP: $publicIp" -ForegroundColor Gray
        Write-Host "   Chave: $KeyPath" -ForegroundColor Gray
        Write-Host ""
        
        if (-not (Test-Path $KeyPath)) {
            Write-Host "❌ Chave SSH não encontrada em: $KeyPath" -ForegroundColor Red
            Write-Host "   Verifique o caminho e tente novamente." -ForegroundColor Yellow
            exit 1
        }
        
        # Tentar usar SSH Agent primeiro
        Write-Host "💡 Tentando usar SSH Agent..." -ForegroundColor Yellow
        Start-Service ssh-agent -ErrorAction SilentlyContinue
        ssh-add $KeyPath 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Chave adicionada ao SSH Agent" -ForegroundColor Green
            Write-Host "   Conectando sem especificar chave..." -ForegroundColor Gray
            ssh ubuntu@$publicIp
        } else {
            Write-Host "⚠️ Não foi possível adicionar ao SSH Agent" -ForegroundColor Yellow
            Write-Host "   Tentando conexão direta..." -ForegroundColor Gray
            ssh -i $KeyPath ubuntu@$publicIp
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔍 Verificando status da aplicação..." -ForegroundColor Cyan
        Write-Host ""
        
        $commandId = aws ssm send-command `
            --instance-ids $instanceId `
            --document-name "AWS-RunShellScript" `
            --parameters commands=@(
                "cd /opt/smartshow/smartshow/web-site",
                "echo '📊 Status dos containers:'",
                "docker-compose ps",
                "echo ''",
                "echo '🌐 Testando API:'",
                "curl -f http://localhost:3000/api/health && echo '✅ API OK!' || echo '❌ API não está respondendo'",
                "echo ''",
                "echo '📋 Últimos logs:'",
                "docker-compose logs --tail=20"
            ) `
            --region $Region `
            --query "Command.CommandId" `
            --output text
        
        if ($commandId) {
            Write-Host "⏳ Aguardando execução do comando..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            
            $result = aws ssm get-command-invocation `
                --command-id $commandId `
                --instance-id $instanceId `
                --region $Region
            
            Write-Host ""
            Write-Host "📋 Resultado:" -ForegroundColor Cyan
            Write-Host $result -ForegroundColor White
        } else {
            Write-Host "❌ Erro ao executar comando" -ForegroundColor Red
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "📋 Obtendo logs do user-data..." -ForegroundColor Cyan
        Write-Host ""
        
        $commandId = aws ssm send-command `
            --instance-ids $instanceId `
            --document-name "AWS-RunShellScript" `
            --parameters commands=@(
                "echo '📋 Últimas 50 linhas do user-data.log:'",
                "tail -50 /var/log/user-data.log"
            ) `
            --region $Region `
            --query "Command.CommandId" `
            --output text
        
        if ($commandId) {
            Write-Host "⏳ Aguardando execução do comando..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
            
            $result = aws ssm get-command-invocation `
                --command-id $commandId `
                --instance-id $instanceId `
                --region $Region `
                --query "StandardOutputContent" `
                --output text
            
            Write-Host $result -ForegroundColor White
        } else {
            Write-Host "❌ Erro ao executar comando" -ForegroundColor Red
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "🔄 Reiniciando aplicação..." -ForegroundColor Cyan
        Write-Host ""
        
        $confirm = Read-Host "Tem certeza que deseja reiniciar a aplicação? (s/n)"
        if ($confirm -ne "s") {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
            exit 0
        }
        
        $commandId = aws ssm send-command `
            --instance-ids $instanceId `
            --document-name "AWS-RunShellScript" `
            --parameters commands=@(
                "cd /opt/smartshow/smartshow/web-site",
                "echo '🛑 Parando containers...'",
                "docker-compose down",
                "echo '🚀 Iniciando containers...'",
                "docker-compose up -d",
                "echo '⏳ Aguardando 10 segundos...'",
                "sleep 10",
                "echo '📊 Status dos containers:'",
                "docker-compose ps"
            ) `
            --region $Region `
            --query "Command.CommandId" `
            --output text
        
        if ($commandId) {
            Write-Host "⏳ Aguardando execução do comando..." -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            
            $result = aws ssm get-command-invocation `
                --command-id $commandId `
                --instance-id $instanceId `
                --region $Region
            
            Write-Host ""
            Write-Host "📋 Resultado:" -ForegroundColor Cyan
            Write-Host $result -ForegroundColor White
        } else {
            Write-Host "❌ Erro ao executar comando" -ForegroundColor Red
        }
    }
    
    "0" {
        Write-Host "Saindo..." -ForegroundColor Yellow
        exit 0
    }
    
    default {
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

