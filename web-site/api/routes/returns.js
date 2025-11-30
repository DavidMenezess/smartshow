// ========================================
// ROTAS DE DEVOLUÇÕES
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const { getStoreFilter } = require('../middleware/store-filter');

const router = express.Router();

// Verificar se a tabela returns existe, se não, criar
async function ensureReturnsTableExists() {
    try {
        console.log('🔍 Verificando existência da tabela returns...');
        const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='returns'");
        
        if (!tableExists) {
            console.log('⚠️ Tabela returns não existe. Criando...');
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS returns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_number TEXT UNIQUE NOT NULL,
                    sale_id INTEGER NOT NULL,
                    sale_item_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    customer_id INTEGER,
                    store_id INTEGER NOT NULL,
                    defect_description TEXT NOT NULL,
                    action_type TEXT NOT NULL CHECK(action_type IN ('same_product', 'different_product', 'refund')),
                    original_price REAL NOT NULL,
                    original_payment_method TEXT NOT NULL,
                    replacement_product_id INTEGER,
                    replacement_price REAL,
                    price_difference REAL DEFAULT 0,
                    refund_amount REAL,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
                    processed_by INTEGER,
                    observations TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    FOREIGN KEY (sale_id) REFERENCES sales(id),
                    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (store_id) REFERENCES stores(id),
                    FOREIGN KEY (replacement_product_id) REFERENCES products(id),
                    FOREIGN KEY (processed_by) REFERENCES users(id)
                )
            `;
            
            await db.run(createTableSQL);
            console.log('✅ Tabela returns criada com sucesso!');
        } else {
            console.log('✅ Tabela returns já existe');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar/criar tabela returns:', error);
        console.error('❌ Mensagem:', error.message);
        console.error('❌ Stack:', error.stack);
        
        // Tentar criar a tabela mesmo assim (ignorar erro de verificação)
        try {
            console.log('🔄 Tentando criar tabela diretamente...');
            await db.run(`
                CREATE TABLE IF NOT EXISTS returns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_number TEXT UNIQUE NOT NULL,
                    sale_id INTEGER NOT NULL,
                    sale_item_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    customer_id INTEGER,
                    store_id INTEGER NOT NULL,
                    defect_description TEXT NOT NULL,
                    action_type TEXT NOT NULL CHECK(action_type IN ('same_product', 'different_product', 'refund')),
                    original_price REAL NOT NULL,
                    original_payment_method TEXT NOT NULL,
                    replacement_product_id INTEGER,
                    replacement_price REAL,
                    price_difference REAL DEFAULT 0,
                    refund_amount REAL,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
                    processed_by INTEGER,
                    observations TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    FOREIGN KEY (sale_id) REFERENCES sales(id),
                    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (store_id) REFERENCES stores(id),
                    FOREIGN KEY (replacement_product_id) REFERENCES products(id),
                    FOREIGN KEY (processed_by) REFERENCES users(id)
                )
            `);
            console.log('✅ Tabela returns criada com sucesso (tentativa direta)!');
        } catch (createError) {
            console.error('❌ Erro ao criar tabela returns (tentativa direta):', createError);
            console.error('❌ Mensagem:', createError.message);
            // Não lançar erro - deixar que a query SQL falhe e seja tratada
        }
    }
}

// Listar devoluções
router.get('/', auth, async (req, res) => {
    try {
        console.log('📥 Requisição GET /returns recebida');
        console.log('👤 Usuário:', req.user ? { id: req.user.id, role: req.user.role, store_id: req.user.store_id } : 'N/A');
        
        // Garantir que a tabela existe
        console.log('🔍 Verificando se tabela returns existe...');
        await ensureReturnsTableExists();
        console.log('✅ Tabela returns verificada/criada');
        
        const { startDate, endDate, status, store_id } = req.query;
        console.log('📋 Parâmetros da query:', { startDate, endDate, status, store_id });
        
        // Query simplificada primeiro para verificar se a tabela existe e tem dados
        let sql = `
            SELECT r.*,
                   s.sale_number,
                   s.payment_method as original_payment_method,
                   p.name as product_name,
                   p.barcode as product_barcode,
                   c.name as customer_name,
                   c.document as customer_document,
                   st.name as store_name,
                   u.name as processed_by_name,
                   rp.name as replacement_product_name
            FROM returns r
            LEFT JOIN sales s ON r.sale_id = s.id
            LEFT JOIN products p ON r.product_id = p.id
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN stores st ON r.store_id = st.id
            LEFT JOIN users u ON r.processed_by = u.id
            LEFT JOIN products rp ON r.replacement_product_id = rp.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            sql += ` AND DATE(r.created_at) >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            sql += ` AND DATE(r.created_at) <= ?`;
            params.push(endDate);
        }

        if (status) {
            sql += ` AND r.status = ?`;
            params.push(status);
        }

        // Filtrar por loja
        const filter = getStoreFilter(req.user, store_id);
        // Se não pode ver todas as lojas, filtrar pela loja do usuário
        if (!filter.canSeeAll) {
            if (filter.store_id) {
                sql += ` AND r.store_id = ?`;
                params.push(filter.store_id);
            }
            // Se não tem store_id, não retornar nada (usuário sem loja não vê devoluções)
        }
        // Se canSeeAll é true, não adicionar filtro (admin/gerente vê todas)

        sql += ` ORDER BY r.created_at DESC`;

        // Executar query com tratamento de erro robusto
        let returns = [];
        try {
            console.log('🔍 Executando query SQL...');
            console.log('📝 SQL completo:', sql);
            console.log('📝 Parâmetros:', JSON.stringify(params));
            console.log('📝 Filtro aplicado:', filter);
            
            // Primeiro, verificar se há dados na tabela (query simples)
            try {
                const countResult = await db.get("SELECT COUNT(*) as count FROM returns");
                console.log('📊 Total de devoluções na tabela:', countResult ? countResult.count : 0);
            } catch (countError) {
                console.error('⚠️ Erro ao contar devoluções (pode ser tabela vazia):', countError.message);
            }
            
            returns = await db.all(sql, params);
            
            console.log('📦 Resultado bruto da query:', typeof returns, Array.isArray(returns) ? returns.length : 'não é array');
            
            if (!returns) {
                console.log('⚠️ Query retornou null/undefined, usando array vazio');
                returns = [];
            } else if (!Array.isArray(returns)) {
                console.log('⚠️ Query não retornou array, convertendo...');
                console.log('⚠️ Tipo recebido:', typeof returns);
                returns = [];
            }
            
            console.log('✅ Query executada com sucesso. Devoluções encontradas:', returns.length);
        } catch (queryError) {
            console.error('❌ Erro na query SQL:', queryError);
            console.error('❌ Mensagem:', queryError.message);
            console.error('❌ Stack:', queryError.stack);
            console.error('❌ SQL:', sql);
            console.error('❌ Parâmetros:', params);
            
            // Se for erro de tabela não encontrada, tentar criar novamente
            if (queryError.message && (
                queryError.message.includes('no such table: returns') ||
                queryError.message.includes('no such table') && queryError.message.includes('returns')
            )) {
                console.log('🔄 Erro de tabela não encontrada. Tentando criar novamente...');
                try {
                    await ensureReturnsTableExists();
                    console.log('✅ Tabela criada. Tentando query novamente...');
                    // Tentar novamente
                    returns = await db.all(sql, params) || [];
                    console.log('✅ Query retry bem-sucedida. Devoluções:', returns.length);
                } catch (retryError) {
                    console.error('❌ Erro ao tentar novamente:', retryError);
                    console.error('❌ Mensagem do retry:', retryError.message);
                    // Retornar array vazio em vez de lançar erro
                    returns = [];
                }
            } else {
                // Para outros erros, também retornar array vazio para não quebrar a interface
                console.error('❌ Erro desconhecido na query. Retornando array vazio.');
                returns = [];
            }
        }
        
        console.log('📤 Enviando resposta com', returns.length, 'devoluções');
        res.json(returns);
    } catch (error) {
        console.error('❌ Erro ao listar devoluções:', error);
        console.error('❌ Stack:', error.stack);
        console.error('❌ Mensagem:', error.message);
        
        // Se o erro for porque a tabela não existe, tentar criar e retornar array vazio
        if (error.message && (
            error.message.includes('no such table: returns') ||
            (error.message.includes('no such table') && error.message.includes('returns'))
        )) {
            console.log('⚠️ Tabela returns não existe. Tentando criar...');
            try {
                await ensureReturnsTableExists();
                // Retornar array vazio após criar tabela
                return res.json([]);
            } catch (createError) {
                console.error('❌ Erro ao criar tabela no catch:', createError);
                // Mesmo assim, retornar array vazio para não quebrar a interface
                return res.json([]);
            }
        }
        
        // Para outros erros, retornar mensagem de erro
        const errorMessage = error.message || 'Erro desconhecido ao listar devoluções';
        console.error('❌ Enviando erro para cliente:', errorMessage);
        
        res.status(500).json({ 
            error: 'Erro ao listar devoluções',
            details: errorMessage,
            type: error.name || 'UnknownError'
        });
    }
});

// Obter devolução por ID
router.get('/:id', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const { id } = req.params;
        
        const returnData = await db.get(
            `SELECT r.*,
                    s.sale_number,
                    s.payment_method as original_payment_method,
                    s.total as sale_total,
                    p.name as product_name,
                    p.barcode as product_barcode,
                    p.price as current_product_price,
                    c.name as customer_name,
                    c.document as customer_document,
                    st.name as store_name,
                    u.name as processed_by_name,
                    rp.name as replacement_product_name,
                    rp.price as replacement_product_price
             FROM returns r
             LEFT JOIN sales s ON r.sale_id = s.id
             LEFT JOIN products p ON r.product_id = p.id
             LEFT JOIN customers c ON r.customer_id = c.id
             LEFT JOIN stores st ON r.store_id = st.id
             LEFT JOIN users u ON r.processed_by = u.id
             LEFT JOIN products rp ON r.replacement_product_id = rp.id
             WHERE r.id = ?`,
            [id]
        );

        if (!returnData) {
            return res.status(404).json({ error: 'Devolução não encontrada' });
        }

        res.json(returnData);
    } catch (error) {
        console.error('Erro ao obter devolução:', error);
        res.status(500).json({ error: 'Erro ao obter devolução' });
    }
});

// Criar devolução
router.post('/', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const {
            sale_id,
            sale_item_id,
            product_id,
            defect_description,
            action_type,
            replacement_product_id,
            observations
        } = req.body;

        if (!sale_id || !sale_item_id || !product_id || !defect_description || !action_type) {
            return res.status(400).json({ error: 'Dados obrigatórios: sale_id, sale_item_id, product_id, defect_description, action_type' });
        }

        // Buscar informações da venda e do item
        const sale = await db.get(
            `SELECT s.*, c.id as customer_id, s.store_id
             FROM sales s
             LEFT JOIN customers c ON s.customer_id = c.id
             WHERE s.id = ?`,
            [sale_id]
        );

        if (!sale) {
            return res.status(404).json({ error: 'Venda não encontrada' });
        }

        const saleItem = await db.get(
            `SELECT si.*, p.price as current_price
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.id = ? AND si.sale_id = ?`,
            [sale_item_id, sale_id]
        );

        if (!saleItem) {
            return res.status(404).json({ error: 'Item da venda não encontrado' });
        }

        // Validar ação
        let replacementProductId = null;
        let replacementPrice = null;
        let priceDifference = 0;
        let refundAmount = null;

        if (action_type === 'different_product') {
            if (!replacement_product_id) {
                return res.status(400).json({ error: 'replacement_product_id é obrigatório para troca por outro produto' });
            }

            const replacementProduct = await db.get('SELECT * FROM products WHERE id = ?', [replacement_product_id]);
            if (!replacementProduct) {
                return res.status(404).json({ error: 'Produto de substituição não encontrado' });
            }

            replacementProductId = replacement_product_id;
            replacementPrice = replacementProduct.price;
            priceDifference = replacementPrice - saleItem.unit_price;
        } else if (action_type === 'refund') {
            refundAmount = saleItem.unit_price;
        }

        // Gerar número da devolução
        const returnNumber = `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Obter store_id
        const userStoreId = req.user.store_id;
        let storeId = sale.store_id || userStoreId;
        if (!storeId) {
            const defaultStore = await db.get('SELECT id FROM stores WHERE is_active = 1 ORDER BY id LIMIT 1');
            storeId = defaultStore ? defaultStore.id : 1;
        }

        // Criar devolução
        const result = await db.run(
            `INSERT INTO returns 
             (return_number, sale_id, sale_item_id, product_id, customer_id, store_id,
              defect_description, action_type, original_price, original_payment_method,
              replacement_product_id, replacement_price, price_difference, refund_amount,
              observations, processed_by, status, processed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                returnNumber,
                sale_id,
                sale_item_id,
                product_id,
                sale.customer_id || null,
                storeId,
                defect_description,
                action_type,
                saleItem.unit_price,
                sale.payment_method,
                replacementProductId,
                replacementPrice,
                priceDifference,
                refundAmount,
                observations || null,
                action_type === 'same_product' ? req.user.id : null, // Se for troca pelo mesmo, já processa
                action_type === 'same_product' ? 'completed' : 'pending',
                action_type === 'same_product' ? new Date().toISOString() : null
            ]
        );

        const returnId = result.lastID;

        // Se for troca pelo mesmo produto, atualizar estoque
        if (action_type === 'same_product') {
            // Devolver produto ao estoque
            await db.run(
                `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                [product_id]
            );

            // Registrar movimentação de estoque
            await db.run(
                `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                 VALUES (?, 'entry', 1, 'Devolução - Troca pelo mesmo produto', ?)`,
                [product_id, req.user.id]
            );
        }

        // Buscar devolução completa
        const returnData = await db.get(
            `SELECT r.*,
                    s.sale_number,
                    p.name as product_name,
                    c.name as customer_name,
                    st.name as store_name
             FROM returns r
             LEFT JOIN sales s ON r.sale_id = s.id
             LEFT JOIN products p ON r.product_id = p.id
             LEFT JOIN customers c ON r.customer_id = c.id
             LEFT JOIN stores st ON r.store_id = st.id
             WHERE r.id = ?`,
            [returnId]
        );

        res.status(201).json(returnData);
    } catch (error) {
        console.error('Erro ao criar devolução:', error);
        res.status(500).json({ error: 'Erro ao criar devolução' });
    }
});

// Processar devolução (troca por outro produto ou reembolso)
router.put('/:id/process', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        const { id } = req.params;
        const { replacement_product_id, refund_amount, observations } = req.body;

        // Buscar devolução
        const returnData = await db.get('SELECT * FROM returns WHERE id = ?', [id]);
        if (!returnData) {
            return res.status(404).json({ error: 'Devolução não encontrada' });
        }

        if (returnData.status !== 'pending') {
            return res.status(400).json({ error: 'Devolução já foi processada ou cancelada' });
        }

        let replacementProductId = returnData.replacement_product_id;
        let replacementPrice = returnData.replacement_price;
        let priceDifference = returnData.price_difference;
        let refundAmount = returnData.refund_amount;

        // Se for troca por outro produto
        if (returnData.action_type === 'different_product') {
            if (replacement_product_id && replacement_product_id !== returnData.replacement_product_id) {
                const replacementProduct = await db.get('SELECT * FROM products WHERE id = ?', [replacement_product_id]);
                if (!replacementProduct) {
                    return res.status(404).json({ error: 'Produto de substituição não encontrado' });
                }

                replacementProductId = replacement_product_id;
                replacementPrice = replacementProduct.sale_price || replacementProduct.price;
                priceDifference = replacementPrice - returnData.original_price;
            }

            // Atualizar estoque: devolver produto original e remover produto de substituição
            await db.run(
                `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                [returnData.product_id]
            );

            if (replacementProductId) {
                await db.run(
                    `UPDATE products SET stock = stock - 1 WHERE id = ?`,
                    [replacementProductId]
                );

                // Registrar movimentações de estoque
                await db.run(
                    `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                     VALUES (?, 'entry', 1, 'Devolução - Produto devolvido', ?)`,
                    [returnData.product_id, req.user.id]
                );

                await db.run(
                    `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                     VALUES (?, 'exit', 1, 'Devolução - Produto de substituição', ?)`,
                    [replacementProductId, req.user.id]
                );
            }
        } else if (returnData.action_type === 'refund') {
            // Para reembolso, apenas devolver produto ao estoque
            await db.run(
                `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                [returnData.product_id]
            );

            await db.run(
                `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                 VALUES (?, 'entry', 1, 'Devolução - Reembolso', ?)`,
                [returnData.product_id, req.user.id]
            );
        }

        // Registrar movimentação de caixa se houver diferença de preço ou reembolso
        if (returnData.action_type === 'different_product' && priceDifference !== 0) {
            // Buscar caixa aberto
            const today = new Date().toISOString().split('T')[0];
            const cashControl = await db.get(
                `SELECT * FROM cash_control 
                 WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
                 AND closing_date IS NULL 
                 AND is_open = 1
                 AND store_id = ?
                 ORDER BY opening_date DESC LIMIT 1`,
                [today, returnData.store_id]
            );
            
            if (cashControl) {
                // Registrar movimentação de caixa
                const movementType = priceDifference > 0 ? 'entry' : 'exit';
                const amount = Math.abs(priceDifference);
                const description = priceDifference > 0 
                    ? `Devolução - Cliente pagou diferença (Troca: ${returnData.return_number})`
                    : `Devolução - Loja devolveu diferença (Troca: ${returnData.return_number})`;
                
                await db.run(
                    `INSERT INTO cash_movements (cash_control_id, type, amount, description, user_id, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [cashControl.id, movementType, amount, description, req.user.id, new Date().toISOString()]
                );
            }
        } else if (returnData.action_type === 'refund' && refundAmount > 0) {
            // Buscar caixa aberto
            const today = new Date().toISOString().split('T')[0];
            const cashControl = await db.get(
                `SELECT * FROM cash_control 
                 WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
                 AND closing_date IS NULL 
                 AND is_open = 1
                 AND store_id = ?
                 ORDER BY opening_date DESC LIMIT 1`,
                [today, returnData.store_id]
            );
            
            if (cashControl) {
                // Registrar saída de caixa para reembolso
                await db.run(
                    `INSERT INTO cash_movements (cash_control_id, type, amount, description, user_id, created_at)
                     VALUES (?, 'exit', ?, ?, ?, ?)`,
                    [cashControl.id, refundAmount, `Devolução - Reembolso (${returnData.return_number})`, req.user.id, new Date().toISOString()]
                );
            }
        }

        // Atualizar devolução
        await db.run(
            `UPDATE returns 
             SET replacement_product_id = ?,
                 replacement_price = ?,
                 price_difference = ?,
                 refund_amount = ?,
                 status = 'completed',
                 processed_by = ?,
                 processed_at = ?,
                 observations = COALESCE(?, observations)
             WHERE id = ?`,
            [
                replacementProductId,
                replacementPrice,
                priceDifference,
                refundAmount,
                req.user.id,
                new Date().toISOString(),
                observations,
                id
            ]
        );

        // Buscar devolução atualizada
        const updatedReturn = await db.get(
            `SELECT r.*,
                    s.sale_number,
                    p.name as product_name,
                    rp.name as replacement_product_name,
                    c.name as customer_name,
                    st.name as store_name,
                    u.name as processed_by_name
             FROM returns r
             LEFT JOIN sales s ON r.sale_id = s.id
             LEFT JOIN products p ON r.product_id = p.id
             LEFT JOIN products rp ON r.replacement_product_id = rp.id
             LEFT JOIN customers c ON r.customer_id = c.id
             LEFT JOIN stores st ON r.store_id = st.id
             LEFT JOIN users u ON r.processed_by = u.id
             WHERE r.id = ?`,
            [id]
        );

        res.json(updatedReturn);
    } catch (error) {
        console.error('Erro ao processar devolução:', error);
        res.status(500).json({ error: 'Erro ao processar devolução' });
    }
});

// Cancelar devolução
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const { id } = req.params;

        const returnData = await db.get('SELECT * FROM returns WHERE id = ?', [id]);
        if (!returnData) {
            return res.status(404).json({ error: 'Devolução não encontrada' });
        }

        if (returnData.status !== 'pending') {
            return res.status(400).json({ error: 'Apenas devoluções pendentes podem ser canceladas' });
        }

        await db.run(
            `UPDATE returns SET status = 'cancelled', processed_by = ?, processed_at = ? WHERE id = ?`,
            [req.user.id, new Date().toISOString(), id]
        );

        res.json({ message: 'Devolução cancelada com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar devolução:', error);
        res.status(500).json({ error: 'Erro ao cancelar devolução' });
    }
});

// Estatísticas de devoluções
router.get('/stats/summary', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const { store_id } = req.query;
        
        const filter = getStoreFilter(req.user, store_id);
        let sql = `SELECT 
            COUNT(*) as total_returns,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_returns,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_returns,
            SUM(CASE WHEN action_type = 'same_product' THEN 1 ELSE 0 END) as same_product_exchanges,
            SUM(CASE WHEN action_type = 'different_product' THEN 1 ELSE 0 END) as different_product_exchanges,
            SUM(CASE WHEN action_type = 'refund' THEN 1 ELSE 0 END) as refunds,
            SUM(COALESCE(refund_amount, 0)) as total_refunded
        FROM returns WHERE 1=1`;
        const params = [];

        if (!filter.canSeeAll || filter.store_id) {
            sql += ` AND store_id = ?`;
            params.push(filter.store_id);
        }

        const stats = await db.get(sql, params);
        res.json(stats);
    } catch (error) {
        console.error('Erro ao obter estatísticas de devoluções:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});

module.exports = router;

