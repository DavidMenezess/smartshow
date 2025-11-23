// ========================================
// ROTAS DE VENDAS
// ========================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// Listar vendas
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, customerId, sellerId } = req.query;
        
        let sql = `
            SELECT s.*, 
                   c.name as customer_name,
                   u.name as seller_name,
                   COUNT(si.id) as items_count
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.seller_id = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            sql += ` AND DATE(s.created_at) >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            sql += ` AND DATE(s.created_at) <= ?`;
            params.push(endDate);
        }

        if (customerId) {
            sql += ` AND s.customer_id = ?`;
            params.push(customerId);
        }

        if (sellerId) {
            sql += ` AND s.seller_id = ?`;
            params.push(sellerId);
        }

        sql += ` GROUP BY s.id ORDER BY s.created_at DESC`;

        const sales = await db.all(sql, params);
        res.json(sales);
    } catch (error) {
        console.error('Erro ao listar vendas:', error);
        res.status(500).json({ error: 'Erro ao listar vendas' });
    }
});

// Obter venda por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sale = await db.get(
            `SELECT s.*, c.name as customer_name, u.name as seller_name
             FROM sales s
             LEFT JOIN customers c ON s.customer_id = c.id
             LEFT JOIN users u ON s.seller_id = u.id
             WHERE s.id = ?`,
            [id]
        );

        if (!sale) {
            return res.status(404).json({ error: 'Venda não encontrada' });
        }

        const items = await db.all(
            `SELECT si.*, p.name as product_name, p.barcode
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?`,
            [id]
        );

        res.json({ ...sale, items });
    } catch (error) {
        console.error('Erro ao obter venda:', error);
        res.status(500).json({ error: 'Erro ao obter venda' });
    }
});

// Criar venda
router.post('/', async (req, res) => {
    try {
        const { customerId, sellerId, items, discount, paymentMethod, observations } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Venda deve ter pelo menos um item' });
        }

        if (!sellerId) {
            return res.status(400).json({ error: 'Vendedor é obrigatório' });
        }

        // Calcular total
        let total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        total = total - (discount || 0);

        // Gerar número da venda
        const saleNumber = `VENDA-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Criar venda
        const saleResult = await db.run(
            `INSERT INTO sales 
             (sale_number, customer_id, seller_id, total, discount, payment_method, observations)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [saleNumber, customerId || null, sellerId, total, discount || 0, paymentMethod, observations || null]
        );

        const saleId = saleResult.lastID;

        // Criar itens da venda e atualizar estoque
        for (const item of items) {
            await db.run(
                `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total)
                 VALUES (?, ?, ?, ?, ?)`,
                [saleId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );

            // Atualizar estoque
            await db.run(
                `UPDATE products SET stock = stock - ? WHERE id = ?`,
                [item.quantity, item.product_id]
            );

            // Registrar movimentação de estoque
            await db.run(
                `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                 VALUES (?, 'exit', ?, 'Venda', ?)`,
                [item.product_id, item.quantity, sellerId]
            );
        }

        // Buscar venda completa
        const sale = await db.get('SELECT * FROM sales WHERE id = ?', [saleId]);
        const saleItems = await db.all(
            `SELECT si.*, p.name as product_name 
             FROM sale_items si 
             JOIN products p ON si.product_id = p.id 
             WHERE si.sale_id = ?`,
            [saleId]
        );

        res.status(201).json({ ...sale, items: saleItems });
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        res.status(500).json({ error: 'Erro ao criar venda' });
    }
});

module.exports = router;




