// ========================================
// ROTAS DE IMPRESSÃO
// ========================================

const express = require('express');
const fiscalPrinter = require('../services/fiscalPrinter');
const pdfGenerator = require('../services/pdfGenerator');

const router = express.Router();

// Conectar impressora fiscal
router.post('/fiscal/connect', async (req, res) => {
    try {
        const { type, vendorId, productId, ip, port } = req.body;
        
        let connected = false;
        if (type === 'usb') {
            connected = await fiscalPrinter.connectUSB(vendorId, productId);
        } else if (type === 'network') {
            connected = await fiscalPrinter.connectNetwork(ip, port);
        }

        if (connected) {
            res.json({ success: true, message: 'Impressora fiscal conectada' });
        } else {
            res.status(500).json({ error: 'Erro ao conectar impressora fiscal' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Imprimir cupom fiscal
router.post('/fiscal/receipt', async (req, res) => {
    try {
        const sale = req.body;
        await fiscalPrinter.printReceipt(sale);
        res.json({ success: true, message: 'Cupom fiscal impresso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Teste de impressão fiscal
router.post('/fiscal/test', async (req, res) => {
    try {
        await fiscalPrinter.testPrint();
        res.json({ success: true, message: 'Teste impresso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gerar PDF de nota de venda
router.post('/pdf/sale-note', async (req, res) => {
    try {
        const sale = req.body;
        const pdfPath = await pdfGenerator.generateSaleNote(sale);
        res.json({ success: true, pdfPath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gerar PDF de ordem de serviço
router.post('/pdf/service-order', async (req, res) => {
    try {
        const order = req.body;
        const pdfPath = await pdfGenerator.generateServiceOrder(order);
        res.json({ success: true, pdfPath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;




