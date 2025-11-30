// ========================================
// ROTAS DE DEVOLUÇÕES
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const { getStoreFilter } = require('../middleware/store-filter');

const router = express.Router();

// Listar devoluções
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, status, store_id } = req.query;
        
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
        if (!filter.canSeeAll && filter.store_id) {
            sql += ` AND r.store_id = ?`;
            params.push(filter.store_id);
        }
        // Se canSeeAll é true, não adicionar filtro (admin/gerente vê todas)

        sql += ` ORDER BY r.created_at DESC`;

        const returns = await db.all(sql, params);
        res.json(returns || []);
    } catch (error) {
        console.error('Erro ao listar devoluções:', error);
        console.error('Stack:', error.stack);
        
        // Se o erro for porque a tabela não existe, retornar array vazio
        if (error.message && error.message.includes('no such table: returns')) {
            console.log('⚠️ Tabela returns não existe ainda. Retornando array vazio.');
            return res.json([]);
        }
        
        res.status(500).json({ 
            error: 'Erro ao listar devoluções',
            details: error.message 
        });
    }
});

// Obter devolução por ID
router.get('/:id', auth, async (req, res) => {
    try {
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
                replacementPrice = replacementProduct.price;
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

