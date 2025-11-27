// ========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ========================================

const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, config.security.jwtSecret);
        const user = await db.get(
            `SELECT id, username, name, role, is_active, store_id 
             FROM users WHERE id = ?`,
            [decoded.id]
        );

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};






