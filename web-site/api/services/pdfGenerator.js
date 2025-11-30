// ========================================
// GERADOR DE PDFs
// ========================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    constructor() {
        // Usar caminho relativo ao diretório da aplicação (/app)
        this.outputDir = path.join(__dirname, '../output');
        if (!fs.existsSync(this.outputDir)) {
            try {
                fs.mkdirSync(this.outputDir, { recursive: true });
                // Garantir permissões
                fs.chmodSync(this.outputDir, 0o755);
            } catch (error) {
                console.error('❌ Erro ao criar diretório output:', error.message);
                // Tentar criar em local alternativo
                this.outputDir = path.join(process.cwd(), 'output');
                if (!fs.existsSync(this.outputDir)) {
                    fs.mkdirSync(this.outputDir, { recursive: true });
                }
            }
        }
    }

    // Gerar nota de venda
    async generateSaleNote(sale) {
        return new Promise((resolve, reject) => {
            const filename = `nota-venda-${sale.saleNumber || Date.now()}.pdf`;
            const filepath = path.join(this.outputDir, filename);
            
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Cabeçalho
            doc.fontSize(20)
               .text('NOTA DE VENDA', { align: 'center' })
               .moveDown();

            // Dados da empresa (configurar conforme necessário)
            doc.fontSize(12)
               .text('NOME DA SUA EMPRESA', { align: 'center' })
               .text('CNPJ: 00.000.000/0001-00', { align: 'center' })
               .text('Endereço: Rua Exemplo, 123', { align: 'center' })
               .moveDown();

            // Dados da venda
            doc.fontSize(10)
               .text(`Nº Venda: ${sale.saleNumber || 'N/A'}`)
               .text(`Data: ${new Date(sale.createdAt || Date.now()).toLocaleString('pt-BR')}`)
               .text(`Cliente: ${sale.customerName || 'Cliente não informado'}`)
               .text(`Vendedor: ${sale.sellerName || 'N/A'}`)
               .moveDown();

            // Tabela de itens
            let y = doc.y;
            doc.fontSize(9)
               .text('Item', 50, y)
               .text('Qtd', 250, y)
               .text('Unit.', 300, y)
               .text('Total', 400, y);

            y += 20;
            if (sale.items && sale.items.length > 0) {
                sale.items.forEach(item => {
                    const name = item.product_name || item.name || 'Produto';
                    const qty = item.quantity || 1;
                    const price = item.unit_price || item.price || 0;
                    const total = item.total || (qty * price);

                    doc.text(name.substring(0, 30), 50, y)
                       .text(qty.toString(), 250, y)
                       .text(`R$ ${price.toFixed(2)}`, 300, y)
                       .text(`R$ ${total.toFixed(2)}`, 400, y);
                    y += 15;
                });
            }

            // Totais
            doc.moveDown()
               .fontSize(12)
               .text(`Subtotal: R$ ${((sale.total || 0) + (sale.discount || 0)).toFixed(2)}`, { align: 'right' });
            
            if (sale.discount > 0) {
                doc.text(`Desconto: R$ ${sale.discount.toFixed(2)}`, { align: 'right' });
            }

            doc.fontSize(14)
               .text(`TOTAL: R$ ${(sale.total || 0).toFixed(2)}`, { align: 'right' })
               .moveDown()
               .text(`Forma de Pagamento: ${sale.paymentMethod || 'Não informado'}`, { align: 'right' });

            // Rodapé
            doc.moveDown(2)
               .fontSize(10)
               .text('Obrigado pela preferência!', { align: 'center' })
               .text('Volte sempre!', { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                resolve(filepath);
            });

            stream.on('error', reject);
        });
    }

    // Gerar ordem de serviço
    async generateServiceOrder(order) {
        return new Promise((resolve, reject) => {
            const filename = `os-${order.orderNumber || Date.now()}.pdf`;
            const filepath = path.join(this.outputDir, filename);
            
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Cabeçalho
            doc.fontSize(20)
               .text('ORDEM DE SERVIÇO', { align: 'center' })
               .moveDown();

            // Dados da empresa
            doc.fontSize(12)
               .text('NOME DA SUA EMPRESA', { align: 'center' })
               .text('CNPJ: 00.000.000/0001-00', { align: 'center' })
               .moveDown();

            // Dados da OS
            doc.fontSize(10)
               .text(`Nº OS: ${order.orderNumber || 'N/A'}`)
               .text(`Data: ${new Date(order.createdAt || Date.now()).toLocaleString('pt-BR')}`)
               .text(`Cliente: ${order.customerName || 'N/A'}`)
               .text(`Telefone: ${order.customerPhone || 'N/A'}`)
               .moveDown();

            // Equipamento
            doc.text('EQUIPAMENTO:', { underline: true })
               .text(`Tipo: ${order.deviceType || 'N/A'}`)
               .text(`Marca: ${order.brand || 'N/A'}`)
               .text(`Modelo: ${order.model || 'N/A'}`)
               .text(`Nº Série: ${order.serialNumber || 'N/A'}`)
               .moveDown();

            // Problema
            doc.text('PROBLEMA RELATADO:', { underline: true })
               .text(order.problemDescription || 'Não informado')
               .moveDown();

            // Diagnóstico
            if (order.diagnostic) {
                doc.text('DIAGNÓSTICO:', { underline: true })
                   .text(order.diagnostic)
                   .moveDown();
            }

            // Valores
            if (order.totalValue > 0) {
                doc.text('VALORES:', { underline: true })
                   .text(`Mão de obra: R$ ${(order.laborCost || 0).toFixed(2)}`)
                   .text(`Peças: R$ ${(order.partsCost || 0).toFixed(2)}`)
                   .text(`TOTAL: R$ ${(order.totalValue || 0).toFixed(2)}`)
                   .moveDown();
            }

            // Status
            doc.text(`Status: ${order.status || 'Pendente'}`)
               .moveDown();

            // Rodapé
            doc.moveDown(2)
               .fontSize(10)
               .text('Assinatura do Cliente: _________________________', { align: 'center' })
               .moveDown()
               .text('Data de Entrega: _________________________', { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                resolve(filepath);
            });

            stream.on('error', reject);
        });
    }

    // Imprimir cupom de troca/devolução
    async printExchangeReceipt(returnData) {
        return new Promise((resolve, reject) => {
            const filename = `cupom-troca-${returnData.returnNumber || Date.now()}.pdf`;
            const filepath = path.join(this.outputDir, filename);
            
            const doc = new PDFDocument({ margin: 50, size: [226.77, 841.89] }); // Tamanho de cupom (80mm)
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Cabeçalho
            doc.fontSize(16)
               .text('CUPOM DE TROCA', { align: 'center' })
               .moveDown(0.5);

            // Dados da empresa
            doc.fontSize(10)
               .text('NOME DA SUA EMPRESA', { align: 'center' })
               .text('CNPJ: 00.000.000/0001-00', { align: 'center' })
               .moveDown(0.5);

            // Linha separadora
            doc.moveTo(50, doc.y)
               .lineTo(176.77, doc.y)
               .stroke()
               .moveDown(0.5);

            // Dados da devolução
            doc.fontSize(9)
               .text(`Nº Devolução: ${returnData.returnNumber}`)
               .text(`Data: ${returnData.date}`)
               .text(`Venda Original: ${returnData.originalSale}`)
               .text(`Cliente: ${returnData.customer}`)
               .moveDown(0.5);

            // Produto devolvido
            doc.fontSize(10)
               .text('PRODUTO DEVOLVIDO:', { underline: true })
               .fontSize(9)
               .text(`${returnData.originalProduct.name}`)
               .text(`Valor: R$ ${parseFloat(returnData.originalProduct.price).toFixed(2)}`)
               .text(`Forma de Pagamento: ${returnData.paymentMethod}${returnData.installments ? ` (${returnData.installments}x)` : ''}`)
               .moveDown(0.5);

            // Defeito
            doc.fontSize(9)
               .text('Defeito Relatado:', { underline: true })
               .text(returnData.defectDescription)
               .moveDown(0.5);

            // Produto de substituição
            if (returnData.replacementProduct) {
                doc.fontSize(10)
                   .text('PRODUTO DE SUBSTITUIÇÃO:', { underline: true })
                   .fontSize(9)
                   .text(`${returnData.replacementProduct.name}`)
                   .text(`Valor: R$ ${parseFloat(returnData.replacementProduct.price).toFixed(2)}`)
                   .moveDown(0.5);
            }

            // Diferença de valor
            if (returnData.priceDifference !== 0) {
                doc.fontSize(10)
                   .text('DIFERENÇA DE VALOR:', { underline: true });
                
                if (returnData.priceDifference > 0) {
                    doc.fontSize(11)
                       .fillColor('#ef4444')
                       .text(`Cliente paga: R$ ${Math.abs(returnData.priceDifference).toFixed(2)}`, { align: 'center' })
                       .fillColor('black');
                } else {
                    doc.fontSize(11)
                       .fillColor('#10b981')
                       .text(`Loja devolve: R$ ${Math.abs(returnData.priceDifference).toFixed(2)}`, { align: 'center' })
                       .fillColor('black');
                }
                doc.moveDown(0.5);
            } else if (returnData.actionType === 'refund') {
                doc.fontSize(10)
                   .text('REEMBOLSO:', { underline: true })
                   .fontSize(11)
                   .fillColor('#10b981')
                   .text(`Valor devolvido: R$ ${parseFloat(returnData.originalProduct.price).toFixed(2)}`, { align: 'center' })
                   .fillColor('black')
                   .moveDown(0.5);
            }

            // Linha separadora
            doc.moveTo(50, doc.y)
               .lineTo(176.77, doc.y)
               .stroke()
               .moveDown(0.5);

            // Rodapé
            doc.fontSize(8)
               .text('Obrigado pela preferência!', { align: 'center' })
               .text('Volte sempre!', { align: 'center' })
               .moveDown(0.5)
               .text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                // Tentar imprimir automaticamente se houver impressora configurada
                this.printPDF(filepath).catch(err => {
                    console.warn('Não foi possível imprimir automaticamente:', err.message);
                });
                resolve(filepath);
            });

            stream.on('error', reject);
        });
    }

    // Imprimir PDF na impressora A4
    async printPDF(filepath) {
        const platform = process.platform;
        try {
            if (platform === 'win32') {
                // Windows: usar o comando padrão de impressão
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                await execAsync(`start /min "" "${filepath}"`);
            } else if (platform === 'linux') {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                await execAsync(`lp "${filepath}"`);
            } else if (platform === 'darwin') {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                await execAsync(`open -a Preview "${filepath}"`);
            }
        } catch (error) {
            console.error('Erro ao imprimir PDF:', error);
            throw error;
        }
    }
}

module.exports = new PDFGenerator();


