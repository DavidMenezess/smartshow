# 🔌 Guia de Implementação - Integração com Hardware

Este documento detalha como integrar o leitor de código de barras, impressora fiscal e impressora A4 no sistema.

---

## 📦 **1. Leitor de Código de Barras**

### **Como Funciona:**
O leitor de código de barras USB funciona como um teclado HID (Human Interface Device). Quando você escaneia um código, ele "digita" o código e pressiona Enter automaticamente.

### **Implementação no Frontend:**

```javascript
// src/js/barcode-reader.js

class BarcodeReader {
    constructor(inputElement) {
        this.input = inputElement;
        this.buffer = '';
        this.timeout = null;
        this.init();
    }

    init() {
        // Capturar entrada do leitor
        this.input.addEventListener('keypress', (e) => {
            // Limpar timeout anterior
            clearTimeout(this.timeout);
            
            // Adicionar caractere ao buffer
            this.buffer += e.key;
            
            // Se pressionar Enter, processar código
            if (e.key === 'Enter') {
                e.preventDefault();
                this.processBarcode(this.buffer.trim());
                this.buffer = '';
            } else {
                // Timeout: se não receber mais caracteres em 100ms, processar
                this.timeout = setTimeout(() => {
                    this.processBarcode(this.buffer.trim());
                    this.buffer = '';
                }, 100);
            }
        });

        // Focar no input quando a página carregar
        window.addEventListener('load', () => {
            this.input.focus();
        });
    }

    async processBarcode(barcode) {
        if (!barcode || barcode.length < 3) return;

        try {
            // Buscar produto pelo código de barras
            const response = await fetch(`/api/products/barcode/${barcode}`);
            const product = await response.json();

            if (product) {
                // Adicionar produto ao carrinho
                this.addToCart(product);
                this.input.value = '';
                this.input.focus();
            } else {
                alert('Produto não encontrado!');
                this.input.value = '';
                this.input.focus();
            }
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            alert('Erro ao processar código de barras');
        }
    }

    addToCart(product) {
        // Implementar lógica de adicionar ao carrinho
        window.cart.addItem(product);
    }
}

// Uso:
const barcodeInput = document.getElementById('barcode-input');
const reader = new BarcodeReader(barcodeInput);
```

### **Backend - Endpoint:**

```javascript
// api/routes/products.js

router.get('/barcode/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        const product = await db.getProductByBarcode(barcode);
        
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Produto não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### **Testes:**
- Conecte o leitor USB
- Abra a tela de vendas
- Escaneie um código de barras
- O produto deve ser adicionado automaticamente

---

## 🧾 **2. Impressora de Cupom Fiscal**

### **Bibliotecas Necessárias:**

```bash
npm install escpos escpos-usb escpos-network
```

### **Implementação:**

```javascript
// api/services/fiscal-printer.js

const escpos = require('escpos');
const usb = require('escpos-usb');

class FiscalPrinter {
    constructor() {
        this.device = null;
        this.printer = null;
        this.connected = false;
    }

    // Conectar via USB
    async connectUSB(vendorId, productId) {
        try {
            this.device = new usb.USB(vendorId, productId);
            this.printer = new escpos.Printer(this.device);
            this.connected = true;
            console.log('✅ Impressora fiscal conectada via USB');
            return true;
        } catch (error) {
            console.error('Erro ao conectar impressora:', error);
            return false;
        }
    }

    // Conectar via rede
    async connectNetwork(ip, port = 9100) {
        try {
            const network = require('escpos-network');
            this.device = new network.Network(ip, port);
            this.printer = new escpos.Printer(this.device);
            this.connected = true;
            console.log('✅ Impressora fiscal conectada via rede');
            return true;
        } catch (error) {
            console.error('Erro ao conectar impressora:', error);
            return false;
        }
    }

    // Imprimir cupom fiscal
    async printReceipt(sale) {
        if (!this.connected) {
            throw new Error('Impressora não conectada');
        }

        try {
            const { items, total, discount, paymentMethod, change } = sale;

            this.printer
                .font('a')
                .align('ct')
                .style('bu')
                .size(1, 1)
                .text('CUPOM FISCAL')
                .text('---')
                .align('lt')
                .text(`Data: ${new Date().toLocaleString('pt-BR')}`)
                .text(`Venda: ${sale.saleNumber}`)
                .text('---')
                .table(['Item', 'Qtd', 'Total']);

            // Itens
            items.forEach(item => {
                this.printer
                    .text(`${item.name}`)
                    .text(`  ${item.quantity}x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.total.toFixed(2)}`);
            });

            this.printer
                .text('---')
                .align('rt')
                .text(`Subtotal: R$ ${(total + discount).toFixed(2)}`);

            if (discount > 0) {
                this.printer.text(`Desconto: R$ ${discount.toFixed(2)}`);
            }

            this.printer
                .text(`TOTAL: R$ ${total.toFixed(2)}`)
                .text('---')
                .text(`Pagamento: ${paymentMethod}`);

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
            console.error('Erro ao imprimir:', error);
            throw error;
        }
    }

    // Teste de impressão
    async testPrint() {
        if (!this.connected) {
            throw new Error('Impressora não conectada');
        }

        this.printer
            .font('a')
            .align('ct')
            .text('TESTE DE IMPRESSAO')
            .text('---')
            .text('Se você está vendo isso,')
            .text('a impressora está funcionando!')
            .cut();

        console.log('✅ Teste de impressão concluído');
    }
}

module.exports = new FiscalPrinter();
```

### **Endpoint da API:**

```javascript
// api/routes/print.js

const fiscalPrinter = require('../services/fiscal-printer');

// Conectar impressora
router.post('/printer/connect', async (req, res) => {
    try {
        const { type, vendorId, productId, ip, port } = req.body;

        let connected = false;
        if (type === 'usb') {
            connected = await fiscalPrinter.connectUSB(vendorId, productId);
        } else if (type === 'network') {
            connected = await fiscalPrinter.connectNetwork(ip, port);
        }

        if (connected) {
            res.json({ success: true, message: 'Impressora conectada' });
        } else {
            res.status(500).json({ error: 'Erro ao conectar impressora' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Imprimir cupom
router.post('/printer/receipt', async (req, res) => {
    try {
        const sale = req.body;
        await fiscalPrinter.printReceipt(sale);
        res.json({ success: true, message: 'Cupom impresso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Teste de impressão
router.post('/printer/test', async (req, res) => {
    try {
        await fiscalPrinter.testPrint();
        res.json({ success: true, message: 'Teste impresso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### **Configuração no Frontend:**

```javascript
// src/js/printer-config.js

async function connectPrinter() {
    const type = document.getElementById('printer-type').value;
    
    let config = {};
    if (type === 'usb') {
        config = {
            type: 'usb',
            vendorId: document.getElementById('vendor-id').value,
            productId: document.getElementById('product-id').value
        };
    } else {
        config = {
            type: 'network',
            ip: document.getElementById('printer-ip').value,
            port: document.getElementById('printer-port').value || 9100
        };
    }

    const response = await fetch('/api/print/printer/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });

    const result = await response.json();
    if (result.success) {
        alert('Impressora conectada!');
    } else {
        alert('Erro ao conectar: ' + result.error);
    }
}
```

### **Encontrar Vendor ID e Product ID (USB):**

```bash
# Linux
lsusb

# Exemplo de saída:
# Bus 001 Device 003: ID 04f9:20e8 Brother Industries, Ltd
# Vendor ID: 04f9
# Product ID: 20e8
```

---

## 🖨️ **3. Impressora A4**

### **Opção 1: Geração de PDF (Recomendado)**

```javascript
// api/services/pdf-generator.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, '../output');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    // Gerar nota de venda
    async generateSaleNote(sale) {
        return new Promise((resolve, reject) => {
            const filename = `nota-venda-${sale.saleNumber}.pdf`;
            const filepath = path.join(this.outputDir, filename);
            
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Cabeçalho
            doc.fontSize(20)
               .text('NOTA DE VENDA', { align: 'center' })
               .moveDown();

            // Dados da empresa
            doc.fontSize(12)
               .text('NOME DA SUA EMPRESA', { align: 'center' })
               .text('CNPJ: 00.000.000/0001-00', { align: 'center' })
               .text('Endereço: Rua Exemplo, 123', { align: 'center' })
               .moveDown();

            // Dados da venda
            doc.text(`Nº Venda: ${sale.saleNumber}`)
               .text(`Data: ${new Date(sale.createdAt).toLocaleString('pt-BR')}`)
               .text(`Cliente: ${sale.customerName || 'Cliente não informado'}`)
               .moveDown();

            // Tabela de itens
            doc.fontSize(10);
            let y = doc.y;
            doc.text('Item', 50, y)
               .text('Qtd', 250, y)
               .text('Unit.', 300, y)
               .text('Total', 400, y);

            y += 20;
            sale.items.forEach(item => {
                doc.text(item.name, 50, y)
                   .text(item.quantity.toString(), 250, y)
                   .text(`R$ ${item.unitPrice.toFixed(2)}`, 300, y)
                   .text(`R$ ${item.total.toFixed(2)}`, 400, y);
                y += 15;
            });

            // Totais
            doc.moveDown()
               .fontSize(12)
               .text(`Subtotal: R$ ${(sale.total + sale.discount).toFixed(2)}`, { align: 'right' });
            
            if (sale.discount > 0) {
                doc.text(`Desconto: R$ ${sale.discount.toFixed(2)}`, { align: 'right' });
            }

            doc.fontSize(14)
               .text(`TOTAL: R$ ${sale.total.toFixed(2)}`, { align: 'right' })
               .moveDown()
               .text(`Forma de Pagamento: ${sale.paymentMethod}`, { align: 'right' });

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
        // Similar ao generateSaleNote, mas com campos de OS
        // Implementar conforme necessário
    }
}

module.exports = new PDFGenerator();
```

### **Opção 2: Impressão Direta (Linux com CUPS)**

```javascript
// api/services/a4-printer.js

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class A4Printer {
    constructor(printerName = 'default') {
        this.printerName = printerName;
    }

    // Imprimir arquivo PDF
    async printPDF(filepath) {
        try {
            const command = `lp -d ${this.printerName} "${filepath}"`;
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr) {
                console.warn('Aviso da impressora:', stderr);
            }
            
            console.log('✅ Documento enviado para impressão');
            return true;
        } catch (error) {
            console.error('Erro ao imprimir:', error);
            throw error;
        }
    }

    // Listar impressoras disponíveis
    async listPrinters() {
        try {
            const { stdout } = await execPromise('lpstat -p -d');
            return stdout;
        } catch (error) {
            console.error('Erro ao listar impressoras:', error);
            return [];
        }
    }
}

module.exports = A4Printer;
```

### **Endpoint da API:**

```javascript
// api/routes/print.js

const PDFGenerator = require('../services/pdf-generator');
const A4Printer = require('../services/a4-printer');

// Gerar e imprimir nota de venda
router.post('/print/sale-note', async (req, res) => {
    try {
        const sale = req.body;
        
        // Gerar PDF
        const pdfPath = await PDFGenerator.generateSaleNote(sale);
        
        // Imprimir (opcional)
        if (req.body.print === true) {
            const printer = new A4Printer(req.body.printerName || 'default');
            await printer.printPDF(pdfPath);
        }
        
        // Retornar caminho do PDF para download
        res.json({ 
            success: true, 
            pdfPath: pdfPath,
            message: 'Nota gerada com sucesso' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## 🧪 **Testes de Hardware**

### **Script de Teste Completo:**

```javascript
// api/scripts/test-hardware.js

const fiscalPrinter = require('../services/fiscal-printer');
const PDFGenerator = require('../services/pdf-generator');

async function testAll() {
    console.log('🧪 Testando hardware...\n');

    // Teste 1: Leitor de código de barras
    console.log('1. Leitor de código de barras:');
    console.log('   ✅ Funciona automaticamente no navegador');
    console.log('   ✅ Teste escaneando um código na tela de vendas\n');

    // Teste 2: Impressora fiscal
    console.log('2. Impressora fiscal:');
    try {
        // Conectar (ajustar IDs conforme sua impressora)
        await fiscalPrinter.connectUSB('0x04f9', '0x20e8');
        await fiscalPrinter.testPrint();
        console.log('   ✅ Impressora fiscal OK\n');
    } catch (error) {
        console.log('   ❌ Erro:', error.message);
    }

    // Teste 3: Impressora A4
    console.log('3. Impressora A4:');
    try {
        const testSale = {
            saleNumber: 'TEST-001',
            customerName: 'Cliente Teste',
            items: [
                { name: 'Produto Teste', quantity: 1, unitPrice: 10.00, total: 10.00 }
            ],
            total: 10.00,
            discount: 0,
            paymentMethod: 'Dinheiro',
            createdAt: new Date()
        };
        
        const pdfPath = await PDFGenerator.generateSaleNote(testSale);
        console.log('   ✅ PDF gerado:', pdfPath);
        console.log('   ✅ Teste de impressão A4 OK\n');
    } catch (error) {
        console.log('   ❌ Erro:', error.message);
    }

    console.log('✅ Testes concluídos!');
}

testAll();
```

---

## 📝 **Checklist de Configuração**

- [ ] Leitor de código de barras conectado e testado
- [ ] Impressora fiscal configurada (USB ou rede)
- [ ] Impressora A4 configurada (CUPS ou drivers)
- [ ] Testes de impressão realizados
- [ ] Backup de configurações salvo

---

**Última atualização:** 2024

















