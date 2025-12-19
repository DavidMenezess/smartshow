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

// Imprimir cupom de troca/devolução
router.post('/exchange-receipt', async (req, res) => {
    try {
        const returnData = req.body;
        const { printerName } = req.body; // Nome da impressora opcional
        
        // Gerar cupom de troca usando PDF
        const receiptData = {
            type: 'exchange',
            returnNumber: returnData.return_number,
            date: new Date().toLocaleString('pt-BR'),
            originalSale: returnData.sale_number,
            customer: returnData.customer_name || 'Cliente não informado',
            originalProduct: {
                name: returnData.product_name,
                price: returnData.original_price
            },
            replacementProduct: returnData.replacement_product_name ? {
                name: returnData.replacement_product_name,
                price: returnData.replacement_price
            } : null,
            priceDifference: returnData.price_difference || 0,
            actionType: returnData.action_type,
            defectDescription: returnData.defect_description,
            paymentMethod: returnData.original_payment_method,
            installments: returnData.installments
        };
        
        // Gerar PDF primeiro
        const pdfPath = await pdfGenerator.printExchangeReceipt(receiptData);
        
        // Tentar imprimir diretamente na impressora USB se o nome foi fornecido
        if (printerName && process.platform === 'win32') {
            try {
                await printDirectToPrinter(pdfPath, printerName);
                console.log('✅ Impresso diretamente na impressora:', printerName);
            } catch (printError) {
                console.warn('⚠️ Não foi possível imprimir diretamente, usando método padrão:', printError.message);
                // Fallback: usar método padrão do Windows
                await pdfGenerator.printPDF(pdfPath);
            }
        } else {
            // Usar método padrão
            await pdfGenerator.printPDF(pdfPath);
        }
        
        res.json({ success: true, message: 'Cupom de troca impresso' });
    } catch (error) {
        console.error('Erro ao imprimir cupom de troca:', error);
        res.status(500).json({ error: error.message });
    }
});

// Função para imprimir diretamente na impressora USB (Windows)
async function printDirectToPrinter(pdfPath, printerName) {
    const platform = process.platform;
    
    if (platform === 'win32') {
        try {
            // Método 1: Usar SumatraPDF (se disponível) - melhor para impressoras fiscais
            try {
                await execAsync(`sumatrapdf.exe -print-to "${printerName}" "${pdfPath}"`);
                return;
            } catch (sumatraError) {
                console.log('⚠️ SumatraPDF não disponível, tentando método alternativo...');
            }
            
            // Método 2: Usar Adobe Reader (se disponível)
            try {
                await execAsync(`"C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe" /t "${pdfPath}" "${printerName}"`);
                return;
            } catch (adobeError) {
                console.log('⚠️ Adobe Reader não disponível, tentando método alternativo...');
            }
            
            // Método 3: Usar comando nativo do Windows (print)
            try {
                await execAsync(`print /D:"${printerName}" "${pdfPath}"`);
                return;
            } catch (printError) {
                console.log('⚠️ Comando print não funcionou, tentando método alternativo...');
            }
            
            // Método 4: Usar PowerShell para imprimir
            try {
                const psCommand = `
                    $printer = Get-Printer -Name "${printerName}" -ErrorAction SilentlyContinue
                    if ($printer) {
                        Start-Process -FilePath "${pdfPath}" -Verb Print -WindowStyle Hidden
                    } else {
                        throw "Impressora não encontrada: ${printerName}"
                    }
                `;
                await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`);
                return;
            } catch (psError) {
                console.log('⚠️ PowerShell não funcionou, usando método padrão...');
            }
            
            // Fallback: usar método padrão
            throw new Error('Nenhum método de impressão direta funcionou');
        } catch (error) {
            console.error('❌ Erro ao imprimir diretamente:', error);
            throw error;
        }
    } else {
        // Linux/Mac: usar lp
        try {
            await execAsync(`lp -d "${printerName}" "${pdfPath}"`);
        } catch (error) {
            throw new Error(`Erro ao imprimir: ${error.message}`);
        }
    }
}

// Detectar impressoras USB conectadas
router.get('/detect', async (req, res) => {
    try {
        console.log('🔍 Iniciando detecção de impressoras...');
        console.log('🔍 Plataforma:', process.platform);
        console.log('🔍 User:', req.user ? req.user.username : 'Não autenticado');
        
        const printers = await detectPrinters();
        
        console.log(`✅ Detecção concluída: ${printers.length} impressora(s) encontrada(s)`);
        printers.forEach((p, idx) => {
            console.log(`  ${idx + 1}. ${p.name} (${p.port}) [${p.type}] ${p.isDefault ? '[PADRÃO]' : ''}`);
        });
        
        res.json({ success: true, printers });
    } catch (error) {
        console.error('❌ Erro ao detectar impressoras:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ error: error.message, printers: [] });
    }
});

// Função para detectar impressoras
async function detectPrinters() {
    const printers = [];
    const platform = process.platform;
    
    try {
        if (platform === 'win32') {
            // Windows: usar PowerShell para detectar TODAS as impressoras (USB, Serial, Rede)
            try {
                // CORREÇÃO CRÍTICA: Comando PowerShell simplificado - usar stdout diretamente
                const psCommand = `
                    $ErrorActionPreference = 'Continue'
                    $printers = Get-Printer -ErrorAction SilentlyContinue
                    $result = @()
                    foreach ($printer in $printers) {
                        $port = if ($printer.PortName) { $printer.PortName.ToString() } else { '' }
                        $name = if ($printer.Name) { $printer.Name.ToString() } else { '' }
                        $driver = if ($printer.DriverName) { $printer.DriverName.ToString() } else { '' }
                        $portUpper = $port.ToUpper()
                        $nameUpper = $name.ToUpper()
                        $driverUpper = $driver.ToUpper()
                        $type = 'other'
                        
                        # Detecção melhorada de USB (incluindo impressoras fiscais)
                        if ($portUpper -like '*USB*' -or $portUpper -like '*TMUSB*' -or 
                            $nameUpper -like '*EPSON*' -or $nameUpper -like '*TM-*' -or $nameUpper -like '*TM-T*' -or
                            $nameUpper -like '*FISCAL*' -or $nameUpper -like '*CUPOM*' -or $nameUpper -like '*RECEIPT*' -or
                            $nameUpper -like '*BEMATECH*' -or $nameUpper -like '*DARUMA*' -or
                            $driverUpper -like '*USB*' -or $driverUpper -like '*TM*' -or $driverUpper -like '*EPSON*') {
                            $type = 'usb'
                        } elseif ($portUpper -like 'COM*') {
                            $type = 'serial'
                        } elseif ($port -match '^\\d+\\.\\d+\\.\\d+\\.\\d+' -or $portUpper -like '*IP_*' -or $portUpper -like '*TCP*') {
                            $type = 'network'
                        }
                        
                        $result += @{
                            Name = $name
                            Port = $port
                            Type = $type
                            IsDefault = if ($printer.Default) { $true } else { $false }
                            Status = if ($printer.PrinterStatus) { $printer.PrinterStatus.ToString() } else { 'Unknown' }
                            Driver = $driver
                            Shared = if ($printer.Shared) { $true } else { $false }
                            Location = if ($printer.Location) { $printer.Location.ToString() } else { '' }
                        }
                    }
                    # Usar [Console]::OutputEncoding para garantir UTF-8
                    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                    $result | ConvertTo-Json -Depth 10 -Compress
                `;
                
                console.log('🔍 Executando PowerShell para detectar impressoras...');
                try {
                    const { stdout, stderr } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`);
                    
                    let cleanOutput = stdout ? stdout.trim() : '';
                    
                    // Remover possíveis mensagens de erro ou warnings
                    if (cleanOutput && (cleanOutput.includes('[') || cleanOutput.includes('{'))) {
                        const jsonStart = cleanOutput.indexOf('[') !== -1 ? cleanOutput.indexOf('[') : cleanOutput.indexOf('{');
                        cleanOutput = cleanOutput.substring(jsonStart);
                    }
                    
                    if (cleanOutput && (cleanOutput.includes(']') || cleanOutput.includes('}'))) {
                        const jsonEnd = cleanOutput.lastIndexOf(']') !== -1 ? cleanOutput.lastIndexOf(']') + 1 : cleanOutput.lastIndexOf('}') + 1;
                        cleanOutput = cleanOutput.substring(0, jsonEnd);
                    }
                    
                    console.log('📋 Output do PowerShell (primeiros 500 chars):', cleanOutput ? cleanOutput.substring(0, 500) : '(vazio)');
                
                    if (cleanOutput) {
                        try {
                            const printerList = JSON.parse(cleanOutput);
                            const printerArray = Array.isArray(printerList) ? printerList : [printerList];
                            
                            console.log(`✅ Encontradas ${printerArray.length} impressora(s) via PowerShell`);
                            
                            printerArray.forEach(printer => {
                                if (printer && printer.Name) {
                                    printers.push({
                                        name: printer.Name,
                                        port: printer.Port || 'N/A',
                                        type: printer.Type || 'other',
                                        isDefault: printer.IsDefault || false,
                                        status: printer.Status || 'Unknown',
                                        driver: printer.Driver || 'N/A',
                                        shared: printer.Shared || false,
                                        location: printer.Location || ''
                                    });
                                    console.log(`  - ${printer.Name} (${printer.Port}) [${printer.Type}]`);
                                }
                            });
                        } catch (parseError) {
                            console.error('❌ Erro ao parsear JSON do PowerShell:', parseError);
                            console.error('❌ Output recebido (primeiros 1000 chars):', cleanOutput ? cleanOutput.substring(0, 1000) : '(vazio)');
                            console.error('❌ Stack:', parseError.stack);
                        }
                    } else {
                        console.warn('⚠️ PowerShell não retornou nenhum output');
                    }
                    
                    if (stderr) {
                        console.warn('⚠️ PowerShell stderr:', stderr);
                    }
                } catch (execError) {
                    console.warn('⚠️ Erro ao executar PowerShell:', execError.message);
                    // Continuar para tentar outros métodos
                }
                
                // CORREÇÃO: Também tentar detectar impressoras USB diretamente via WMI
                try {
                    const wmicCommand = `wmic printer where "PortName like '%USB%' or PortName like '%TMUSB%'" get Name,PortName,Default /format:csv`;
                    const { stdout: wmicOutput } = await execAsync(wmicCommand);
                    const lines = wmicOutput.split('\r\n').filter(line => line.trim() && !line.startsWith('Node') && !line.startsWith(','));
                    
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        
                        const parts = line.split(',');
                        if (parts.length >= 3) {
                            const name = parts[1]?.trim();
                            const port = parts[2]?.trim();
                            const isDefault = parts[3]?.trim() === 'TRUE';
                            
                            if (name && name !== 'Name' && name.length > 0) {
                                // Verificar se já não foi adicionada
                                const alreadyAdded = printers.some(p => p.name === name);
                                if (!alreadyAdded) {
                                    printers.push({
                                        name: name,
                                        port: port || 'N/A',
                                        type: 'usb',
                                        isDefault: isDefault || false
                                    });
                                }
                            }
                        }
                    }
                } catch (wmicError) {
                    console.log('⚠️ Não foi possível usar WMI para detectar impressoras USB:', wmicError.message);
                }
                
                // CORREÇÃO: Sempre tentar WMI como método adicional, não apenas se não encontrou nada
                // Isso garante que impressoras sejam detectadas mesmo se PowerShell falhar parcialmente
                console.log('🔍 Tentando método adicional via WMI...');
                try {
                    const { stdout: wmicOutput } = await execAsync('wmic printer get name,portname,default /format:csv');
                    const lines = wmicOutput.split('\r\n').filter(line => line.trim() && !line.startsWith('Node') && !line.startsWith(','));
                    
                    console.log(`📋 WMI retornou ${lines.length} linha(s)`);
                    
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        
                        const parts = line.split(',');
                        if (parts.length >= 3) {
                            const name = parts[1]?.trim();
                            const port = parts[2]?.trim();
                            const isDefault = parts[3]?.trim() === 'TRUE';
                            
                            if (name && name !== 'Name' && name.length > 0) {
                                // Verificar se já não foi adicionada
                                const alreadyAdded = printers.some(p => p.name === name);
                                if (!alreadyAdded) {
                                    let type = 'other';
                                    const portUpper = (port || '').toUpperCase();
                                    const nameUpper = (name || '').toUpperCase();
                                    
                                    // Detecção melhorada incluindo TMUSB e nomes de impressoras fiscais
                                    if (portUpper.includes('USB') || portUpper.includes('TMUSB') || 
                                        nameUpper.includes('EPSON') || nameUpper.includes('TM-') || 
                                        nameUpper.includes('TM-T') || nameUpper.includes('RECEIPT') ||
                                        nameUpper.includes('FISCAL') || nameUpper.includes('CUPOM') ||
                                        nameUpper.includes('BEMATECH') || nameUpper.includes('DARUMA')) {
                                        type = 'usb';
                                    } else if (portUpper.includes('COM')) {
                                        type = 'serial';
                                    } else if (port && (port.match(/^\d+\.\d+\.\d+\.\d+/) || portUpper.includes('IP_') || portUpper.includes('TCP'))) {
                                        type = 'network';
                                    }
                                    
                                    printers.push({
                                        name: name,
                                        port: port || 'N/A',
                                        type: type,
                                        isDefault: isDefault || false
                                    });
                                    console.log(`  + WMI: ${name} (${port}) [${type}]`);
                                }
                            }
                        }
                    }
                } catch (wmicError) {
                    console.warn('⚠️ Erro ao usar WMI como método adicional:', wmicError.message);
                }
                
                // CORREÇÃO FINAL: Se ainda não encontrou impressoras, tentar método mais simples
                if (printers.length === 0) {
                    console.log('🔍 Nenhuma impressora encontrada. Tentando método mais simples...');
                    try {
                        // Método mais simples: usar apenas Get-Printer sem filtros
                        const simpleCommand = `Get-Printer | Select-Object -Property Name, PortName, Default | ConvertTo-Json -Compress`;
                        const { stdout: simpleOutput } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${simpleCommand}"`);
                        
                        const cleanSimple = simpleOutput.trim();
                        if (cleanSimple) {
                            try {
                                const simpleList = JSON.parse(cleanSimple);
                                const simpleArray = Array.isArray(simpleList) ? simpleList : [simpleList];
                                
                                simpleArray.forEach(printer => {
                                    if (printer && printer.Name) {
                                        const port = (printer.PortName || '').toString();
                                        const name = (printer.Name || '').toString();
                                        const portUpper = port.toUpperCase();
                                        const nameUpper = name.toUpperCase();
                                        
                                        let type = 'other';
                                        if (portUpper.includes('USB') || portUpper.includes('TMUSB') || 
                                            nameUpper.includes('EPSON') || nameUpper.includes('TM-') || 
                                            nameUpper.includes('RECEIPT') || nameUpper.includes('FISCAL')) {
                                            type = 'usb';
                                        } else if (portUpper.includes('COM')) {
                                            type = 'serial';
                                        } else if (port.match(/^\d+\.\d+\.\d+\.\d+/)) {
                                            type = 'network';
                                        }
                                        
                                        printers.push({
                                            name: name,
                                            port: port || 'N/A',
                                            type: type,
                                            isDefault: printer.Default || false
                                        });
                                        console.log(`  + Método simples: ${name} (${port}) [${type}]`);
                                    }
                                });
                            } catch (e) {
                                console.warn('⚠️ Erro ao parsear método simples:', e.message);
                            }
                        }
                    } catch (simpleError) {
                        console.warn('⚠️ Método simples também falhou:', simpleError.message);
                    }
                }
            } catch (psError) {
                console.error('❌ Erro ao usar PowerShell:', psError);
                console.error('❌ Detalhes:', psError.message);
                console.error('❌ Stack:', psError.stack);
                // Não lançar erro, apenas logar e tentar método alternativo
            }
        } else if (platform === 'linux') {
            // Linux: usar múltiplos métodos para detectar TODAS as impressoras
            console.log('🔍 Detectando impressoras no Linux...');
            
            // Método 1: lpstat -p (lista todas as impressoras)
            try {
                console.log('🔍 Tentando método 1: lpstat -p...');
                const { stdout } = await execAsync('lpstat -p 2>&1 || echo ""');
                const lines = stdout.split('\n').filter(line => line.trim());
                
                console.log(`📋 lpstat retornou ${lines.length} linha(s)`);
                
                for (const line of lines) {
                    // Padrão: "printer EPSON_TM-T20X_Receipt is idle.  enabled since ..."
                    const match = line.match(/printer\s+(\S+)/i);
                    if (match) {
                        const printerName = match[1];
                        // Obter mais informações sobre a impressora
                        try {
                            const { stdout: info } = await execAsync(`lpstat -p "${printerName}" -l 2>&1 || echo ""`);
                            let port = 'USB';
                            let type = 'usb';
                            
                            // Verificar se é USB, serial ou rede
                            if (info.includes('usb://') || info.includes('USB') || printerName.toUpperCase().includes('USB')) {
                                port = 'USB';
                                type = 'usb';
                            } else if (info.includes('serial://') || info.includes('COM') || printerName.toUpperCase().includes('SERIAL')) {
                                port = 'Serial';
                                type = 'serial';
                            } else if (info.includes('socket://') || info.includes('ipp://') || info.includes('http://')) {
                                port = 'Network';
                                type = 'network';
                            }
                            
                            // Verificar se é impressora fiscal por nome
                            const nameUpper = printerName.toUpperCase();
                            if (nameUpper.includes('EPSON') || nameUpper.includes('TM-') || nameUpper.includes('TM-T') || 
                                nameUpper.includes('RECEIPT') || nameUpper.includes('FISCAL') || nameUpper.includes('CUPOM') ||
                                nameUpper.includes('BEMATECH') || nameUpper.includes('DARUMA')) {
                                type = 'usb';
                            }
                            
                            printers.push({
                                name: printerName,
                                port: port,
                                type: type,
                                isDefault: false
                            });
                            console.log(`  ✓ lpstat: ${printerName} (${port}) [${type}]`);
                        } catch (infoError) {
                            // Se não conseguir info detalhada, adicionar mesmo assim
                            printers.push({
                                name: printerName,
                                port: 'USB',
                                type: 'usb',
                                isDefault: false
                            });
                            console.log(`  ✓ lpstat: ${printerName} (USB) [usb]`);
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ Método lpstat falhou:', e.message);
            }
            
            // Método 2: lp -l (lista impressoras com detalhes)
            if (printers.length === 0) {
                try {
                    console.log('🔍 Tentando método 2: lp -l...');
                    const { stdout } = await execAsync('lp -l 2>&1 | head -20 || echo ""');
                    const lines = stdout.split('\n').filter(line => line.trim());
                    
                    for (const line of lines) {
                        // Procurar por nomes de impressoras no output
                        const match = line.match(/([A-Za-z0-9_-]+(?:EPSON|TM|Receipt|Fiscal|Cupom)[A-Za-z0-9_-]*)/i);
                        if (match) {
                            const printerName = match[1];
                            const alreadyAdded = printers.some(p => p.name === printerName);
                            if (!alreadyAdded) {
                                printers.push({
                                    name: printerName,
                                    port: 'USB',
                                    type: 'usb',
                                    isDefault: false
                                });
                                console.log(`  ✓ lp -l: ${printerName}`);
                            }
                        }
                    }
                } catch (e2) {
                    console.warn('⚠️ Método lp -l falhou:', e2.message);
                }
            }
            
            // Método 3: lsusb (detectar impressoras USB conectadas)
            try {
                console.log('🔍 Tentando método 3: lsusb...');
                const { stdout } = await execAsync('lsusb 2>&1 | grep -iE "(printer|epson|bematech|daruma|tm)" || echo ""');
                const lines = stdout.split('\n').filter(line => line.trim());
                
                lines.forEach((line, index) => {
                    const match = line.match(/ID\s+([0-9a-fA-F]{4}):([0-9a-fA-F]{4})\s+(.+)/i);
                    if (match) {
                        const vendorId = match[1];
                        const productId = match[2];
                        const description = match[3];
                        
                        // Verificar se já não foi adicionada
                        const nameFromDesc = description.split(' ').slice(2).join(' ') || `Impressora USB ${index + 1}`;
                        const alreadyAdded = printers.some(p => p.name === nameFromDesc || p.port.includes(vendorId));
                        
                        if (!alreadyAdded) {
                            printers.push({
                                name: nameFromDesc,
                                port: `USB ${vendorId}:${productId}`,
                                type: 'usb',
                                isDefault: false
                            });
                            console.log(`  ✓ lsusb: ${nameFromDesc} (USB ${vendorId}:${productId})`);
                        }
                    }
                });
            } catch (e3) {
                console.warn('⚠️ Método lsusb falhou:', e3.message);
            }
            
            // Método 4: Verificar diretório /dev/usb (impressoras USB diretas)
            try {
                console.log('🔍 Tentando método 4: /dev/usb...');
                const { stdout } = await execAsync('ls -1 /dev/usb/lp* 2>/dev/null || ls -1 /dev/usb/* 2>/dev/null || echo ""');
                const lines = stdout.split('\n').filter(line => line.trim() && line.includes('lp'));
                
                lines.forEach((line, index) => {
                    const port = line.trim();
                    const alreadyAdded = printers.some(p => p.port === port);
                    
                    if (!alreadyAdded) {
                        printers.push({
                            name: `Impressora USB ${index + 1}`,
                            port: port,
                            type: 'usb',
                            isDefault: false
                        });
                        console.log(`  ✓ /dev/usb: Impressora USB ${index + 1} (${port})`);
                    }
                });
            } catch (e4) {
                console.warn('⚠️ Método /dev/usb falhou:', e4.message);
            }
            
            // Método 5: Verificar CUPS diretamente (se disponível)
            try {
                console.log('🔍 Tentando método 5: CUPS...');
                const { stdout } = await execAsync('lpstat -a 2>&1 || echo ""');
                const lines = stdout.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    // Formato: "EPSON_TM-T20X_Receipt accepting requests since..."
                    const match = line.match(/^(\S+)\s+accepting/i);
                    if (match) {
                        const printerName = match[1];
                        const alreadyAdded = printers.some(p => p.name === printerName);
                        
                        if (!alreadyAdded) {
                            // Verificar tipo por nome
                            const nameUpper = printerName.toUpperCase();
                            let type = 'usb';
                            if (nameUpper.includes('EPSON') || nameUpper.includes('TM-') || nameUpper.includes('RECEIPT') ||
                                nameUpper.includes('FISCAL') || nameUpper.includes('CUPOM')) {
                                type = 'usb';
                            }
                            
                            printers.push({
                                name: printerName,
                                port: 'USB',
                                type: type,
                                isDefault: false
                            });
                            console.log(`  ✓ CUPS: ${printerName} (USB) [${type}]`);
                        }
                    }
                }
            } catch (e5) {
                console.warn('⚠️ Método CUPS falhou:', e5.message);
            }
            
            console.log(`✅ Total de impressoras detectadas no Linux: ${printers.length}`);
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














