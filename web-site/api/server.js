// ========================================
// SERVIDOR EXPRESS - API PRINCIPAL
// ========================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const routes = require('./routes');

const app = express();

// Middleware
app.use(cors(config.api.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../src')));

// Rotas da API
app.use('/api', routes);

// Rota raiz - redirecionar para index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

// Rotas para arquivos HTML (evitar erro 404)
app.get('/*.html', (req, res) => {
    const fileName = req.path.split('/').pop();
    const filePath = path.join(__dirname, '../src', fileName);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send('Página não encontrada');
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'SQLite',
        version: '1.0.0'
    });
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Iniciar servidor
const PORT = config.api.port;
const HOST = config.api.host;

app.listen(PORT, HOST, () => {
    console.log('🚀 Servidor iniciado!');
    console.log(`📡 API rodando em http://${HOST}:${PORT}`);
    console.log(`🌐 Frontend disponível em http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`🗄️ Banco de dados: SQLite`);
});

module.exports = app;



