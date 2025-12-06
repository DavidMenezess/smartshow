// ========================================
// ROTAS DE FORNECEDORES
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Listar todos os fornecedores
router.get('/', auth, async (req, res) => {
    try {
        const { search } = req.query;
        
        let sql = 'SELECT * FROM suppliers WHERE 1=1';
        const params = [];

        if (search) {
            sql += ` AND name LIKE ?`;
            params.push(`%${search}%`);
        }

        sql += ` ORDER BY name`;

        const suppliers = await db.all(sql, params);
        res.json(suppliers);
    } catch (error) {
        console.error('Erro ao listar fornecedores:', error);
        res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
});

// Obter fornecedor por ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
        
        if (supplier) {
            res.json(supplier);
        } else {
            res.status(404).json({ error: 'Fornecedor não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao obter fornecedor:', error);
        res.status(500).json({ error: 'Erro ao obter fornecedor' });
    }
});

// Criar fornecedor
router.post('/', auth, async (req, res) => {
    try {
        const { name, cnpj, phone, email, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = await db.run(
            `INSERT INTO suppliers (name, cnpj, phone, email, address) VALUES (?, ?, ?, ?, ?)`,
            [name, cnpj || null, phone || null, email || null, address || null]
        );

        const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [result.lastID]);
        res.status(201).json(supplier);
    } catch (error) {
        console.error('Erro ao criar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao criar fornecedor' });
    }
});

// Atualizar fornecedor
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, cnpj, phone, email, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        await db.run(
            `UPDATE suppliers SET name = ?, cnpj = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
            [name, cnpj || null, phone || null, email || null, address || null, id]
        );

        const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
        res.json(supplier);
    } catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    }
});

// Deletar fornecedor
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se há produtos vinculados
        const hasProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?', [id]);
        if (hasProducts.count > 0) {
            return res.status(400).json({ error: 'Não é possível excluir o fornecedor. Existem produtos vinculados a ele.' });
        }
        
        await db.run('DELETE FROM suppliers WHERE id = ?', [id]);
        res.json({ success: true, message: 'Fornecedor deletado' });
    } catch (error) {
        console.error('Erro ao deletar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao deletar fornecedor' });
    }
});

module.exports = router;










