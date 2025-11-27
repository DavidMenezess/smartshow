// ========================================
// ROTAS DE PRODUTOS
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Listar todos os produtos
router.get('/', auth, async (req, res) => {
    try {
        const { search, category, active } = req.query;
        const user = req.user;
        
        let sql = `
            SELECT p.*, c.name as category_name, s.name as supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE 1=1
        `;
        const params = [];

        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            sql += ` AND p.store_id = ?`;
            params.push(user.store_id);
        }

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
router.get('/barcode/:barcode', auth, async (req, res) => {
    try {
        const { barcode } = req.params;
        const user = req.user;
        
        let sql = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.barcode = ? AND p.is_active = 1
        `;
        const params = [barcode];

        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            sql += ` AND p.store_id = ?`;
            params.push(user.store_id);
        }
        
        const product = await db.get(sql, params);

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
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        let sql = `
            SELECT p.*, c.name as category_name, s.name as supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?
        `;
        const params = [id];

        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            sql += ` AND p.store_id = ?`;
            params.push(user.store_id);
        }
        
        const product = await db.get(sql, params);

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
router.post('/', auth, async (req, res) => {
    try {
        const {
            barcode, name, description, category_id, supplier_id,
            brand, model, cost_price, sale_price, stock, min_stock
        } = req.body;
        const user = req.user;

        if (!name || !sale_price) {
            return res.status(400).json({ error: 'Nome e preço de venda são obrigatórios' });
        }

        // Definir store_id automaticamente (exceto admin)
        const storeId = (user.role === 'admin' && req.body.store_id) ? req.body.store_id : user.store_id;

        const result = await db.run(
            `INSERT INTO products 
             (barcode, name, description, category_id, supplier_id, brand, model, 
              cost_price, sale_price, stock, min_stock, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [barcode || null, name, description || null, category_id || null, supplier_id || null,
             brand || null, model || null, cost_price || 0, sale_price, stock || 0, min_stock || 0, storeId || null]
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
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const {
            barcode, name, description, category_id, supplier_id,
            brand, model, cost_price, sale_price, stock, min_stock, is_active
        } = req.body;

        // Verificar se o produto pertence à loja do usuário (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            const product = await db.get('SELECT store_id FROM products WHERE id = ?', [id]);
            if (!product || product.store_id !== user.store_id) {
                return res.status(403).json({ error: 'Acesso negado. Produto não pertence à sua loja.' });
            }
        }

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
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Verificar se o produto pertence à loja do usuário (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            const product = await db.get('SELECT store_id FROM products WHERE id = ?', [id]);
            if (!product || product.store_id !== user.store_id) {
                return res.status(403).json({ error: 'Acesso negado. Produto não pertence à sua loja.' });
            }
        }

        await db.run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
        res.json({ success: true, message: 'Produto desativado' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto' });
    }
});

module.exports = router;



