// ========================================
// ROTAS DE IMPRESSÃO
// ========================================

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fiscalPrinter = require('../services/fiscalPrinter');
const pdfGenerator = require('../services/pdfGenerator');

const execAsync = promisify(exec);
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
        const { type, path } = req.body;
        await fiscalPrinter.testPrint(type, path);
        res.json({ success: true, message: 'Teste impresso com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Detectar impressoras USB conectadas
router.get('/detect', async (req, res) => {
    try {
        const printers = await detectPrinters();
        res.json({ success: true, printers });
    } catch (error) {
        console.error('Erro ao detectar impressoras:', error);
        res.status(500).json({ error: error.message });
    }
});

// Função para detectar impressoras
async function detectPrinters() {
    const printers = [];
    const platform = process.platform;
    
    try {
        if (platform === 'win32') {
            // Windows: usar wmic para listar impressoras
            try {
                const { stdout } = await execAsync('wmic printer get name,portname,default /format:csv');
                const lines = stdout.split('\r\n').filter(line => line.trim() && !line.startsWith('Node') && !line.startsWith(','));
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    const parts = line.split(',');
                    if (parts.length >= 3) {
                        // CSV do wmic tem formato: Node,Name,PortName,Default
                        const name = parts[1]?.trim();
                        const port = parts[2]?.trim();
                        const isDefault = parts[3]?.trim() === 'TRUE';
                        
                        if (name && name !== 'Name' && name.length > 0) {
                            printers.push({
                                name: name,
                                port: port || 'N/A',
                                type: (port && (port.startsWith('USB') || port.includes('USB'))) ? 'usb' : 'other',
                                isDefault: isDefault || false
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao executar wmic:', error);
                // Tentar método alternativo usando PowerShell
                try {
                    const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, PortName | ConvertTo-Json"');
                    const printerList = JSON.parse(stdout);
                    const printerArray = Array.isArray(printerList) ? printerList : [printerList];
                    
                    printerArray.forEach(printer => {
                        if (printer && printer.Name) {
                            printers.push({
                                name: printer.Name,
                                port: printer.PortName || 'N/A',
                                type: (printer.PortName && printer.PortName.includes('USB')) ? 'usb' : 'other',
                                isDefault: false
                            });
                        }
                    });
                } catch (psError) {
                    console.error('Erro ao usar PowerShell:', psError);
                    throw new Error('Não foi possível detectar impressoras no Windows');
                }
            }
        } else if (platform === 'linux') {
            // Linux: usar lpstat ou lsusb
            try {
                const { stdout } = await execAsync('lpstat -p -d 2>/dev/null || lpstat -p 2>/dev/null || echo ""');
                const lines = stdout.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    const match = line.match(/printer\s+(\S+)/i);
                    if (match) {
                        const printerName = match[1];
                        printers.push({
                            name: printerName,
                            port: 'USB',
                            type: 'usb',
                            isDefault: false
                        });
                    }
                }
            } catch (e) {
                // Se lpstat falhar, tentar lsusb para impressoras USB
                try {
                    const { stdout } = await execAsync('lsusb | grep -i printer || echo ""');
                    const lines = stdout.split('\n').filter(line => line.trim());
                    lines.forEach((line, index) => {
                        const match = line.match(/ID\s+([0-9a-fA-F]{4}):([0-9a-fA-F]{4})/);
                        if (match) {
                            printers.push({
                                name: `Impressora USB ${index + 1}`,
                                port: `/dev/usb/lp${index}`,
                                type: 'usb',
                                isDefault: false
                            });
                        }
                    });
                } catch (e2) {
                    console.error('Erro ao detectar impressoras USB:', e2);
                }
            }
        } else if (platform === 'darwin') {
            // macOS: usar lpstat
            try {
                const { stdout } = await execAsync('lpstat -p -d 2>/dev/null || echo ""');
                const lines = stdout.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    const match = line.match(/printer\s+(\S+)/i);
                    if (match) {
                        const printerName = match[1];
                        printers.push({
                            name: printerName,
                            port: 'USB',
                            type: 'usb',
                            isDefault: false
                        });
                    }
                }
            } catch (e) {
                console.error('Erro ao detectar impressoras no macOS:', e);
            }
        }
        
        // Remover duplicatas
        const uniquePrinters = [];
        const seen = new Set();
        for (const printer of printers) {
            const key = `${printer.name}-${printer.port}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniquePrinters.push(printer);
            }
        }
        
        return uniquePrinters;
    } catch (error) {
        console.error('Erro ao detectar impressoras:', error);
        throw new Error('Erro ao detectar impressoras: ' + error.message);
    }
}

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














