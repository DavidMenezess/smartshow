// ========================================
// ROTAS DE CLIENTES
// ========================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// Listar clientes
router.get('/', async (req, res) => {
    try {
        const { search, active } = req.query;
        
        let sql = 'SELECT * FROM customers WHERE 1=1';
        const params = [];

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
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
        
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
router.post('/', async (req, res) => {
    try {
        const { name, cpf_cnpj, phone, email, address, city, state, zip_code, credit_limit } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = await db.run(
            `INSERT INTO customers 
             (name, cpf_cnpj, phone, email, address, city, state, zip_code, credit_limit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, cpf_cnpj || null, phone || null, email || null, address || null,
             city || null, state || null, zip_code || null, credit_limit || 0]
        );

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
        res.status(201).json(customer);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, cpf_cnpj, phone, email, address, city, state, zip_code, credit_limit, is_active } = req.body;

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




