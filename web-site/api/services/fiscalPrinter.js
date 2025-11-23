// ========================================
// SERVIÇO DE IMPRESSORA FISCAL
// ========================================

// Carregar escpos apenas quando necessário para evitar problemas no Docker
let escpos = null;

function getEscpos() {
    if (!escpos) {
        try {
            escpos = require('escpos');
        } catch (error) {
            console.error('❌ Erro ao carregar escpos:', error.message);
            return null;
        }
    }
    return escpos;
}

// escpos-usb será carregado apenas quando necessário (lazy loading)
// para evitar crash no Docker que não tem acesso a USB

class FiscalPrinter {
    constructor() {
        this.device = null;
        this.printer = null;
        this.connected = false;
    }

    // Conectar via USB
    async connectUSB(vendorId, productId) {
        try {
            // Carregar escpos-usb apenas quando necessário
            let escposUSB;
            try {
                escposUSB = require('escpos-usb');
            } catch (error) {
                console.error('❌ Não foi possível carregar escpos-usb:', error.message);
                console.log('⚠️ Acesso USB não disponível (normal em containers Docker)');
                return false;
            }

            // Converter string hex para número se necessário
            const vendor = typeof vendorId === 'string' ? parseInt(vendorId, 16) : vendorId;
            const product = typeof productId === 'string' ? parseInt(productId, 16) : productId;

            const escpos = getEscpos();
            if (!escpos) {
                throw new Error('Módulo escpos não disponível');
            }

            this.device = new escposUSB.USB(vendor, product);
            this.printer = new escpos.Printer(this.device);
            this.connected = true;
            console.log('✅ Impressora fiscal conectada via USB');
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar impressora USB:', error);
            this.connected = false;
            return false;
        }
    }

    // Conectar via rede (usando TCP direto)
    async connectNetwork(ip, port = 9100) {
        try {
            // Usar net module do Node.js para conexão TCP
            const escpos = getEscpos();
            if (!escpos) {
                throw new Error('Módulo escpos não disponível');
            }

            const net = require('net');
            const socket = new net.Socket();
            
            return new Promise((resolve, reject) => {
                socket.connect(port, ip, () => {
                    this.device = socket;
                    this.printer = new escpos.Printer(this.device);
                    this.connected = true;
                    console.log(`✅ Impressora fiscal conectada via rede (${ip}:${port})`);
                    resolve(true);
                });
                
                socket.on('error', (error) => {
                    console.error('❌ Erro ao conectar impressora de rede:', error);
                    this.connected = false;
                    reject(false);
                });
            });
        } catch (error) {
            console.error('❌ Erro ao conectar impressora de rede:', error);
            this.connected = false;
            return false;
        }
    }

    // Imprimir cupom fiscal
    async printReceipt(sale) {
        if (!this.connected) {
            throw new Error('Impressora não conectada');
        }

        try {
            const { items, total, discount, paymentMethod, change, saleNumber, createdAt } = sale;

            this.printer
                .font('a')
                .align('ct')
                .style('bu')
                .size(1, 1)
                .text('CUPOM FISCAL')
                .text('---')
                .align('lt')
                .text(`Data: ${new Date(createdAt || Date.now()).toLocaleString('pt-BR')}`)
                .text(`Venda: ${saleNumber || 'N/A'}`)
                .text('---')
                .table(['Item', 'Qtd', 'Total']);

            // Itens
            if (items && items.length > 0) {
                items.forEach(item => {
                    const name = item.product_name || item.name || 'Produto';
                    const qty = item.quantity || 1;
                    const price = item.unit_price || item.price || 0;
                    const itemTotal = item.total || (qty * price);

                    this.printer
                        .text(`${name}`)
                        .text(`  ${qty}x R$ ${price.toFixed(2)} = R$ ${itemTotal.toFixed(2)}`);
                });
            }

            this.printer
                .text('---')
                .align('rt')
                .text(`Subtotal: R$ ${((total || 0) + (discount || 0)).toFixed(2)}`);

            if (discount > 0) {
                this.printer.text(`Desconto: R$ ${discount.toFixed(2)}`);
            }

            this.printer
                .text(`TOTAL: R$ ${(total || 0).toFixed(2)}`)
                .text('---')
                .text(`Pagamento: ${paymentMethod || 'Não informado'}`);

            if (change > 0) {
                this.printer.text(`Troco: R$ ${change.toFixed(2)}`);
            }

            this.printer
                .text('---')
                .align('ct')
                .text('Obrigado pela preferência!')
                .text('Volte sempre!')
                .cut();

            console.log('✅ Cupom fiscal impresso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao imprimir:', error);
            throw error;
        }
    }

    // Teste de impressão
    async testPrint() {
        if (!this.connected) {
            throw new Error('Impressora não conectada');
        }

        try {
            this.printer
                .font('a')
                .align('ct')
                .text('TESTE DE IMPRESSAO')
                .text('---')
                .text('Se você está vendo isso,')
                .text('a impressora está funcionando!')
                .text('---')
                .text(new Date().toLocaleString('pt-BR'))
                .cut();

            console.log('✅ Teste de impressão concluído');
            return true;
        } catch (error) {
            console.error('❌ Erro no teste de impressão:', error);
            throw error;
        }
    }
}

module.exports = new FiscalPrinter();


