# ========================================
# SECURITY GROUPS
# ========================================

resource "aws_security_group" "smartshow" {
  name_prefix = "${var.project_name}-${var.environment}-"
  description = "Security Group for Smartshow"
  vpc_id      = data.aws_vpc.default.id

  # SSH - Acesso do usuario (IP especifico)
  ingress {
    description = "SSH_User_Access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.your_ip]
  }

  # SSH - Acesso do GitHub Actions e CI/CD (qualquer IP)
  ingress {
    description = "SSH_CI_CD_GitHub_Actions"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # API
  ingress {
    description = "API Node.js"
    from_port   = var.api_port
    to_port     = var.api_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-sg"
  }
}


