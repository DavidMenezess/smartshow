# ========================================
# OUTPUTS
# ========================================

output "public_ip" {
  description = "IP Público do servidor"
  value       = aws_eip.smartshow.public_ip
}

output "dashboard_url" {
  description = "URL do Dashboard"
  value       = "http://${aws_eip.smartshow.public_ip}"
}

output "api_url" {
  description = "URL da API"
  value       = "http://${aws_eip.smartshow.public_ip}:${var.api_port}"
}

output "ssh_command" {
  description = "Comando SSH"
  value       = "ssh -i ${var.key_name}.pem ubuntu@${aws_eip.smartshow.public_ip}"
}

output "deployment_summary" {
  description = "Resumo do deployment"
  value = {
    projeto    = var.project_name
    ip_publico = aws_eip.smartshow.public_ip
    dashboard  = "http://${aws_eip.smartshow.public_ip}"
    api        = "http://${aws_eip.smartshow.public_ip}:${var.api_port}"
  }
}

output "instrucoes_deploy" {
  description = "Instruções após o deploy"
  value       = <<-EOT
    
    ✅ DEPLOY AUTOMÁTICO INICIADO!
    
    📋 O que está acontecendo automaticamente:
    1. ✅ Instância EC2 criada
    2. ⏳ Docker sendo instalado...
    3. ⏳ Repositório sendo clonado...
    4. ⏳ Containers sendo construídos...
    5. ⏳ Aplicação sendo iniciada...
    
    ⏱️  Tempo estimado: 5-10 minutos
    
    🌐 URLs da aplicação (aguarde alguns minutos):
       - Dashboard: http://${aws_eip.smartshow.public_ip}
       - API: http://${aws_eip.smartshow.public_ip}:3000
    
    🔍 Para verificar o progresso:
       ssh -i ${var.key_name}.pem ubuntu@${aws_eip.smartshow.public_ip} 'tail -f /var/log/user-data.log'
    
    🔍 Para verificar status da aplicação:
       ssh -i ${var.key_name}.pem ubuntu@${aws_eip.smartshow.public_ip} '/home/ubuntu/verificar-aplicacao.sh'
    
    📝 Logs da aplicação:
       ssh -i ${var.key_name}.pem ubuntu@${aws_eip.smartshow.public_ip} 'cd /opt/smartshow/smartshow/web-site && docker-compose logs -f'
    
    ⚠️  IMPORTANTE: Aguarde 5-10 minutos para a aplicação estar totalmente pronta!
    
  EOT
}


