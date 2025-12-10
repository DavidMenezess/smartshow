// ========================================
// ROTAS DE CATEGORIAS
// ========================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// Listar todas as categorias
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        
        let sql = 'SELECT * FROM categories WHERE 1=1';
        const params = [];

        if (search) {
            sql += ` AND name LIKE ?`;
            params.push(`%${search}%`);
        }

        sql += ` ORDER BY name`;

        const categories = await db.all(sql, params);
        res.json(categories);
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        res.status(500).json({ error: 'Erro ao listar categorias' });
    }
});

// Obter categoria por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const category = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
        
        if (category) {
            res.json(category);
        } else {
            res.status(404).json({ error: 'Categoria não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao obter categoria:', error);
        res.status(500).json({ error: 'Erro ao obter categoria' });
    }
});

// Criar categoria
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = await db.run(
            `INSERT INTO categories (name, description) VALUES (?, ?)`,
            [name, description || null]
        );

        const category = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
        res.status(201).json(category);
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        if (error.message.includes('UNIQUE constraint')) {
            res.status(400).json({ error: 'Categoria já existe' });
        } else {
            res.status(500).json({ error: 'Erro ao criar categoria' });
        }
    }
});

// Atualizar categoria
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        await db.run(
            `UPDATE categories SET name = ?, description = ? WHERE id = ?`,
            [name, description || null, id]
        );

        const category = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
        res.json(category);
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});

// Deletar categoria
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ success: true, message: 'Categoria deletada' });
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
});

module.exports = router;


























