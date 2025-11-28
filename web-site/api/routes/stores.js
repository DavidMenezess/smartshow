// ========================================
// ROTAS DE LOJAS/FILIAIS
// ========================================

const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Listar todas as lojas
router.get('/', auth, async (req, res) => {
    try {
        const stores = await db.all(
            `SELECT * FROM stores ORDER BY name ASC`
        );
        res.json(stores);
    } catch (error) {
        console.error('Erro ao listar lojas:', error);
        res.status(500).json({ error: 'Erro ao listar lojas' });
    }
});

// Obter loja por ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const store = await db.get('SELECT * FROM stores WHERE id = ?', [id]);
        
        if (!store) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }
        
        res.json(store);
    } catch (error) {
        console.error('Erro ao obter loja:', error);
        res.status(500).json({ error: 'Erro ao obter loja' });
    }
});

// Criar nova loja
router.post('/', auth, async (req, res) => {
    try {
        const { name, address, city, state, phone, email } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nome da loja é obrigatório' });
        }
        
        // Verificar se já existe loja com o mesmo nome
        const existing = await db.get('SELECT id FROM stores WHERE name = ?', [name]);
        if (existing) {
            return res.status(400).json({ error: 'Já existe uma loja com este nome' });
        }
        
        const result = await db.run(
            `INSERT INTO stores (name, address, city, state, phone, email, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [name, address || null, city || null, state || null, phone || null, email || null]
        );
        
        const newStore = await db.get('SELECT * FROM stores WHERE id = ?', [result.lastID]);
        res.status(201).json(newStore);
    } catch (error) {
        console.error('Erro ao criar loja:', error);
        res.status(500).json({ error: 'Erro ao criar loja' });
    }
});

// Atualizar loja
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, city, state, phone, email, is_active } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nome da loja é obrigatório' });
        }
        
        // Verificar se loja existe
        const store = await db.get('SELECT id FROM stores WHERE id = ?', [id]);
        if (!store) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }
        
        // Verificar se já existe outra loja com o mesmo nome
        const existing = await db.get('SELECT id FROM stores WHERE name = ? AND id != ?', [name, id]);
        if (existing) {
            return res.status(400).json({ error: 'Já existe outra loja com este nome' });
        }
        
        await db.run(
            `UPDATE stores 
             SET name = ?, address = ?, city = ?, state = ?, phone = ?, email = ?, is_active = ?
             WHERE id = ?`,
            [name, address || null, city || null, state || null, phone || null, email || null, is_active !== undefined ? is_active : 1, id]
        );
        
        const updatedStore = await db.get('SELECT * FROM stores WHERE id = ?', [id]);
        res.json(updatedStore);
    } catch (error) {
        console.error('Erro ao atualizar loja:', error);
        res.status(500).json({ error: 'Erro ao atualizar loja' });
    }
});

// Excluir loja
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se loja existe
        const store = await db.get('SELECT id FROM stores WHERE id = ?', [id]);
        if (!store) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }
        
        // Verificar se há vendas, produtos, clientes ou OS vinculados a esta loja
        const hasSales = await db.get('SELECT COUNT(*) as count FROM sales WHERE store_id = ?', [id]);
        const hasProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE store_id = ?', [id]);
        const hasCustomers = await db.get('SELECT COUNT(*) as count FROM customers WHERE store_id = ?', [id]);
        const hasServiceOrders = await db.get('SELECT COUNT(*) as count FROM service_orders WHERE store_id = ?', [id]);
        const hasUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE store_id = ?', [id]);
        
        if (hasSales.count > 0 || hasProducts.count > 0 || hasCustomers.count > 0 || 
            hasServiceOrders.count > 0 || hasUsers.count > 0) {
            return res.status(400).json({ 
                error: 'Não é possível excluir a loja. Existem registros vinculados a ela (vendas, produtos, clientes, OS ou usuários).' 
            });
        }
        
        await db.run('DELETE FROM stores WHERE id = ?', [id]);
        res.json({ message: 'Loja excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir loja:', error);
        res.status(500).json({ error: 'Erro ao excluir loja' });
    }
});

module.exports = router;



