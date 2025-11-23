# ========================================
# INSTÂNCIA EC2 - SERVIDOR DA APLICAÇÃO
# ========================================

resource "aws_instance" "smartshow" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.smartshow.id]

  # Configurações para garantir elegibilidade no Free Tier
  monitoring = false # Desabilitado para Free Tier

  root_block_device {
    volume_type           = "gp2"
    volume_size           = var.ebs_volume_size
    delete_on_termination = true
    encrypted             = false # Não criptografado para Free Tier
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    github_repo  = var.github_repo
    github_token = var.github_token != "" ? nonsensitive(var.github_token) : ""
  }))

  # Forçar reexecução do user-data quando o script mudar
  user_data_replace_on_change = true

  tags = {
    Name = "${var.project_name}-${var.environment}"
  }

  depends_on = [aws_security_group.smartshow]
}

# Elastic IP
resource "aws_eip" "smartshow" {
  domain   = "vpc"
  instance = aws_instance.smartshow.id

  tags = {
    Name = "${var.project_name}-${var.environment}-eip"
  }
}


