// ========================================
// ROTAS DE USUÁRIOS (Apenas Admin)
// ========================================

const express = require('express');
const db = require('../database');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware para verificar se é admin
const requireAdmin = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' });
        }
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// Listar usuários (apenas admin)
router.get('/', auth, requireAdmin, async (req, res) => {
    try {
        const users = await db.all('SELECT id, username, name, role, is_active, last_login, created_at FROM users ORDER BY name');
        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// Obter usuário por ID (apenas admin)
router.get('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db.get('SELECT id, username, name, role, is_active, last_login, created_at FROM users WHERE id = ?', [id]);
        
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        res.status(500).json({ error: 'Erro ao obter usuário' });
    }
});

// Criar usuário (apenas admin)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const { username, password, name, role, is_active } = req.body;

        if (!username || !password || !name || !role) {
            return res.status(400).json({ error: 'Username, senha, nome e função são obrigatórios' });
        }

        // Validar role
        const validRoles = ['admin', 'gerente', 'vendedor', 'tecnico', 'caixa'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Função inválida' });
        }

        // Verificar se username já existe
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: 'Username já existe' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário
        const result = await db.run(
            'INSERT INTO users (username, password, name, role, is_active) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, name, role, is_active !== undefined ? is_active : 1]
        );

        const user = await db.get('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?', [result.lastID]);
        res.status(201).json(user);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Atualizar usuário (apenas admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, name, role, is_active } = req.body;

        // Validar role se fornecido
        if (role) {
            const validRoles = ['admin', 'gerente', 'vendedor', 'tecnico', 'caixa'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: 'Função inválida' });
            }
        }

        // Verificar se username já existe (se mudou)
        if (username) {
            const existingUser = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
            if (existingUser) {
                return res.status(400).json({ error: 'Username já existe' });
            }
        }

        // Construir query dinamicamente
        const updates = [];
        const params = [];

        if (username) {
            updates.push('username = ?');
            params.push(username);
        }
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (role) {
            updates.push('role = ?');
            params.push(role);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active ? 1 : 0);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

        await db.run(sql, params);

        const user = await db.get('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?', [id]);
        res.json(user);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// Excluir usuário (apenas admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Não permitir excluir a si mesmo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
        }

        // Não permitir excluir o último admin
        const adminCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1', ['admin']);
        const user = await db.get('SELECT role FROM users WHERE id = ?', [id]);
        
        if (user && user.role === 'admin' && adminCount.count <= 1) {
            return res.status(400).json({ error: 'Não é possível excluir o último administrador' });
        }

        await db.run('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

module.exports = router;


