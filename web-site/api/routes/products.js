// ========================================
// ROTAS DE PRODUTOS
// ========================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// Listar todos os produtos
router.get('/', async (req, res) => {
    try {
        const { search, category, active } = req.query;
        
        let sql = `
            SELECT p.*, c.name as category_name, s.name as supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (p.name LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            sql += ` AND p.category_id = ?`;
            params.push(category);
        }

        if (active !== undefined) {
            sql += ` AND p.is_active = ?`;
            params.push(active === 'true' ? 1 : 0);
        } else {
            // Por padrão, mostrar apenas produtos ativos
            sql += ` AND p.is_active = 1`;
        }

        sql += ` ORDER BY p.name`;

        const products = await db.all(sql, params);
        res.json(products);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro ao listar produtos' });
    }
});

// Buscar produto por código de barras
router.get('/barcode/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        
        const product = await db.get(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.barcode = ? AND p.is_active = 1`,
            [barcode]
        );

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Produto não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

// Obter produto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await db.get(
            `SELECT p.*, c.name as category_name, s.name as supplier_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN suppliers s ON p.supplier_id = s.id
             WHERE p.id = ?`,
            [id]
        );

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Produto não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao obter produto:', error);
        res.status(500).json({ error: 'Erro ao obter produto' });
    }
});

// Criar produto
router.post('/', async (req, res) => {
    try {
        const {
            barcode, name, description, category_id, supplier_id,
            brand, model, cost_price, sale_price, stock, min_stock
        } = req.body;

        if (!name || !sale_price) {
            return res.status(400).json({ error: 'Nome e preço de venda são obrigatórios' });
        }

        const result = await db.run(
            `INSERT INTO products 
             (barcode, name, description, category_id, supplier_id, brand, model, 
              cost_price, sale_price, stock, min_stock)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [barcode || null, name, description || null, category_id || null, supplier_id || null,
             brand || null, model || null, cost_price || 0, sale_price, stock || 0, min_stock || 0]
        );

        const product = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
        res.status(201).json(product);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        if (error.message.includes('UNIQUE constraint')) {
            res.status(400).json({ error: 'Código de barras já existe' });
        } else {
            res.status(500).json({ error: 'Erro ao criar produto' });
        }
    }
});

// Atualizar produto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            barcode, name, description, category_id, supplier_id,
            brand, model, cost_price, sale_price, stock, min_stock, is_active
        } = req.body;

        await db.run(
            `UPDATE products SET
             barcode = ?, name = ?, description = ?, category_id = ?, supplier_id = ?,
             brand = ?, model = ?, cost_price = ?, sale_price = ?, stock = ?, 
             min_stock = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [barcode || null, name, description || null, category_id || null, supplier_id || null,
             brand || null, model || null, cost_price || 0, sale_price, stock || 0, 
             min_stock || 0, is_active !== undefined ? is_active : 1, id]
        );

        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        res.json(product);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

// Deletar produto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
        res.json({ success: true, message: 'Produto desativado' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto' });
    }
});

module.exports = router;



