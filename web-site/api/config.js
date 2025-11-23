// ========================================
// CONFIGURAÇÃO DO SISTEMA
// ========================================

require('dotenv').config();

const config = {
    // API
    api: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true
        }
    },

    // Banco de dados
    database: {
        type: process.env.DATABASE_TYPE || 'sqlite',
        sqlite: {
            path: process.env.SQLITE_PATH || './data/loja.db'
        }
    },

    // Segurança
    security: {
        // ⚠️ IMPORTANTE: Configure JWT_SECRET via variável de ambiente em produção!
        // Use: export JWT_SECRET="sua-chave-super-secreta-aqui"
        jwtSecret: process.env.JWT_SECRET || 'loja-eletronicos-secret-key-change-in-production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: 10
    },

    // Impressoras
    printers: {
        fiscal: {
            type: process.env.FISCAL_PRINTER_TYPE || 'usb', // usb, network
            usb: {
                vendorId: process.env.FISCAL_PRINTER_VENDOR_ID,
                productId: process.env.FISCAL_PRINTER_PRODUCT_ID
            },
            network: {
                ip: process.env.FISCAL_PRINTER_IP || '192.168.1.100',
                port: process.env.FISCAL_PRINTER_PORT || 9100
            }
        },
        a4: {
            name: process.env.A4_PRINTER_NAME || 'default',
            cupsEnabled: process.env.CUPS_ENABLED === 'true'
        }
    },

    // Upload
    upload: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf']
    }
};

module.exports = config;








