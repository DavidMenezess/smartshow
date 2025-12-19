// ========================================
// INSTALAR SERVIÇO WINDOWS PARA DETECÇÃO AUTOMÁTICA
// Este script instala o detector como serviço Windows
// ========================================

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function installService() {
    console.log('🔧 Instalando serviço Windows para detecção automática de impressoras...');
    
    const scriptPath = path.join(__dirname, 'local-printer-detector.js');
    const serviceName = 'SmartShowPrinterDetector';
    const serviceDisplayName = 'SmartShow - Detector de Impressoras';
    const serviceDescription = 'Detecta automaticamente impressoras instaladas no Windows para o sistema SmartShow';
    
    // Verificar se node-windows está instalado
    try {
        require('node-windows');
    } catch (e) {
        console.log('📦 Instalando node-windows...');
        await execAsync('npm install -g node-windows');
    }
    
    const Service = require('node-windows').Service;
    
    // Criar serviço
    const svc = new Service({
        name: serviceName,
        description: serviceDescription,
        script: scriptPath,
        nodeOptions: [
            '--harmony',
            '--max_old_space_size=4096'
        ]
    });
    
    // Instalar serviço
    svc.on('install', function() {
        console.log('✅ Serviço instalado com sucesso!');
        console.log('🚀 Iniciando serviço...');
        svc.start();
    });
    
    svc.on('start', function() {
        console.log('✅ Serviço iniciado com sucesso!');
        console.log('✅ A detecção de impressoras agora é AUTOMÁTICA!');
        console.log('✅ O serviço iniciará automaticamente quando o Windows iniciar.');
    });
    
    svc.on('error', function(err) {
        console.error('❌ Erro ao instalar serviço:', err);
    });
    
    svc.install();
}

// Executar instalação
installService().catch(console.error);

