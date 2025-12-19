// ========================================
// SERVIÇO LOCAL DE DETECÇÃO DE IMPRESSORAS
// Este script roda localmente no Windows do cliente
// ========================================

// Tentar carregar dependências de diferentes locais
let express, cors;
const paths = [
    './api/node_modules',
    './node_modules',
    '../api/node_modules',
    '../../api/node_modules'
];

let found = false;
for (const path of paths) {
    try {
        const expressPath = require.resolve('express', { paths: [path] });
        const corsPath = require.resolve('cors', { paths: [path] });
        express = require(expressPath);
        cors = require(corsPath);
        found = true;
        console.log(`✅ Dependências encontradas em: ${path}`);
        break;
    } catch (e) {
        // Continuar tentando
    }
}

if (!found) {
    try {
        express = require('express');
        cors = require('cors');
        found = true;
        console.log('✅ Dependências encontradas globalmente');
    } catch (e) {
        console.error('❌ Erro: Dependências não encontradas!');
        console.error('❌ Execute: cd api && npm install express cors');
        console.error('❌ Ou instale globalmente: npm install -g express cors');
        process.exit(1);
    }
}

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = 3001; // Porta diferente da API principal

app.use(cors());
app.use(express.json());

// Detectar impressoras no Windows
async function detectPrintersWindows() {
    const printers = [];
    
    try {
        console.log('🔍 Detectando impressoras no Windows...');
        
        // Comando PowerShell para detectar TODAS as impressoras
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
                
                # Detecção de tipo
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
                }
            }
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            $result | ConvertTo-Json -Depth 10 -Compress
        `;
        
        const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`);
        
        let cleanOutput = stdout ? stdout.trim() : '';
        
        // Limpar output
        if (cleanOutput && (cleanOutput.includes('[') || cleanOutput.includes('{'))) {
            const jsonStart = cleanOutput.indexOf('[') !== -1 ? cleanOutput.indexOf('[') : cleanOutput.indexOf('{');
            cleanOutput = cleanOutput.substring(jsonStart);
        }
        
        if (cleanOutput && (cleanOutput.includes(']') || cleanOutput.includes('}'))) {
            const jsonEnd = cleanOutput.lastIndexOf(']') !== -1 ? cleanOutput.lastIndexOf(']') + 1 : cleanOutput.lastIndexOf('}') + 1;
            cleanOutput = cleanOutput.substring(0, jsonEnd);
        }
        
        if (cleanOutput) {
            try {
                const printerList = JSON.parse(cleanOutput);
                const printerArray = Array.isArray(printerList) ? printerList : [printerList];
                
                printerArray.forEach(printer => {
                    if (printer && printer.Name) {
                        printers.push({
                            name: printer.Name,
                            port: printer.Port || 'N/A',
                            type: printer.Type || 'other',
                            isDefault: printer.IsDefault || false,
                            status: printer.Status || 'Unknown',
                            driver: printer.Driver || 'N/A'
                        });
                    }
                });
            } catch (parseError) {
                console.error('Erro ao parsear JSON:', parseError);
            }
        }
        
        // Fallback: WMI
        if (printers.length === 0) {
            try {
                const { stdout: wmicOutput } = await execAsync('wmic printer get name,portname,default /format:csv');
                const lines = wmicOutput.split('\r\n').filter(line => line.trim() && !line.startsWith('Node') && !line.startsWith(','));
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const parts = line.split(',');
                    if (parts.length >= 3) {
                        const name = parts[1]?.trim();
                        const port = parts[2]?.trim();
                        const isDefault = parts[3]?.trim() === 'TRUE';
                        
                        if (name && name !== 'Name' && name.length > 0) {
                            const portUpper = (port || '').toUpperCase();
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
                                isDefault: isDefault || false
                            });
                        }
                    }
                }
            } catch (wmicError) {
                console.error('Erro ao usar WMI:', wmicError);
            }
        }
        
    } catch (error) {
        console.error('Erro ao detectar impressoras:', error);
    }
    
    return printers;
}

// Rota para detectar impressoras
app.get('/detect', async (req, res) => {
    try {
        const printers = await detectPrintersWindows();
        console.log(`✅ ${printers.length} impressora(s) detectada(s)`);
        res.json({ success: true, printers });
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message, printers: [] });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', platform: process.platform });
});

// Iniciar servidor
app.listen(PORT, 'localhost', () => {
    console.log(`🚀 Servidor local de detecção de impressoras rodando em http://localhost:${PORT}`);
    console.log(`🔍 Plataforma: ${process.platform}`);
});

