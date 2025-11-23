// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        }

        // Buscar usuário
        const user = await db.get(
            'SELECT * FROM users WHERE username = ? AND is_active = 1',
            [username]
        );

        if (!user) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        // Verificar senha
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        // Atualizar último login
        await db.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Gerar token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            config.security.jwtSecret,
            { expiresIn: config.security.jwtExpiresIn }
        );

        // Remover senha da resposta
        delete user.password;

        res.json({
            success: true,
            token,
            user
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// Verificar token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, config.security.jwtSecret);
        const user = await db.get('SELECT id, username, name, role FROM users WHERE id = ?', [decoded.id]);

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

module.exports = router;




