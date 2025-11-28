// ========================================
// ROTAS DE CLIENTES
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Listar clientes
router.get('/', auth, async (req, res) => {
    try {
        const { search, active } = req.query;
        const user = req.user;
        
        let sql = 'SELECT * FROM customers WHERE 1=1';
        const params = [];

        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            sql += ` AND store_id = ?`;
            params.push(user.store_id);
        }

        if (search) {
            sql += ` AND (name LIKE ? OR cpf_cnpj LIKE ? OR phone LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (active !== undefined) {
            sql += ` AND is_active = ?`;
            params.push(active === 'true' ? 1 : 0);
        }

        sql += ` ORDER BY name`;

        const customers = await db.all(sql, params);
        res.json(customers);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
});

// Obter cliente por ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        let sql = 'SELECT * FROM customers WHERE id = ?';
        const params = [id];

        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            sql += ` AND store_id = ?`;
            params.push(user.store_id);
        }
        
        const customer = await db.get(sql, params);
        
        if (customer) {
            res.json(customer);
        } else {
            res.status(404).json({ error: 'Cliente não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao obter cliente:', error);
        res.status(500).json({ error: 'Erro ao obter cliente' });
    }
});

// Criar cliente
router.post('/', auth, async (req, res) => {
    try {
        const { name, cpf_cnpj, phone, email, address, city, state, zip_code, credit_limit } = req.body;
        const user = req.user;

        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        // Definir store_id automaticamente (exceto admin)
        let storeId = (user.role === 'admin' && req.body.store_id) ? req.body.store_id : user.store_id;
        
        // Se store_id for null, usar loja padrão (id=1) ou buscar a primeira loja ativa
        if (!storeId) {
            const defaultStore = await db.get('SELECT id FROM stores WHERE is_active = 1 ORDER BY id LIMIT 1');
            storeId = defaultStore ? defaultStore.id : 1;
        }

        const result = await db.run(
            `INSERT INTO customers 
             (name, cpf_cnpj, phone, email, address, city, state, zip_code, credit_limit, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, cpf_cnpj || null, phone || null, email || null, address || null,
             city || null, state || null, zip_code || null, credit_limit || 0, storeId]
        );

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
        res.status(201).json(customer);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// Atualizar cliente
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { name, cpf_cnpj, phone, email, address, city, state, zip_code, credit_limit, is_active } = req.body;

        // Verificar se o cliente pertence à loja do usuário (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            const customer = await db.get('SELECT store_id FROM customers WHERE id = ?', [id]);
            if (!customer || customer.store_id !== user.store_id) {
                return res.status(403).json({ error: 'Acesso negado. Cliente não pertence à sua loja.' });
            }
        }

        await db.run(
            `UPDATE customers SET
             name = ?, cpf_cnpj = ?, phone = ?, email = ?, address = ?,
             city = ?, state = ?, zip_code = ?, credit_limit = ?, is_active = ?
             WHERE id = ?`,
            [name, cpf_cnpj || null, phone || null, email || null, address || null,
             city || null, state || null, zip_code || null, credit_limit || 0,
             is_active !== undefined ? is_active : 1, id]
        );

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
        res.json(customer);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

module.exports = router;









