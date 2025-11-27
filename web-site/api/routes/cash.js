// ========================================
// ROTAS DE CONTROLE DE CAIXA
// ========================================

const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Obter estado atual do caixa
router.get('/status', auth, async (req, res) => {
    try {
        const user = req.user;
        // Buscar o último registro de caixa aberto hoje
        const today = new Date().toISOString().split('T')[0];
        
        let cashControlSql = `
            SELECT * FROM cash_control 
            WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
            AND closing_date IS NULL 
            AND is_open = 1
        `;
        const cashControlParams = [today];
        
        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            cashControlSql += ` AND store_id = ?`;
            cashControlParams.push(user.store_id);
        }
        cashControlSql += ` ORDER BY opening_date DESC LIMIT 1`;
        
        const cashControl = await db.get(cashControlSql, cashControlParams);
        
        if (cashControl) {
            // Buscar vendas do dia
            let todaySalesSql = `
                SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
                FROM sales 
                WHERE DATE(datetime(created_at, '-3 hours')) = ?
            `;
            const todaySalesParams = [today];
            if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
                todaySalesSql += ` AND store_id = ?`;
                todaySalesParams.push(user.store_id);
            }
            const todaySales = await db.get(todaySalesSql, todaySalesParams);
            
            res.json({
                isOpen: true,
                initialCash: cashControl.initial_cash || 0,
                todaySales: parseFloat(todaySales?.total || 0),
                currentBalance: (cashControl.initial_cash || 0) + parseFloat(todaySales?.total || 0),
                openedAt: cashControl.opening_date,
                observations: cashControl.observations || ''
            });
        } else {
            res.json({
                isOpen: false,
                initialCash: 0,
                todaySales: 0,
                currentBalance: 0,
                openedAt: null,
                observations: ''
            });
        }
    } catch (error) {
        console.error('Erro ao buscar estado do caixa:', error);
        res.status(500).json({ error: 'Erro ao buscar estado do caixa', details: error.message });
    }
});

// Abrir caixa
router.post('/open', auth, async (req, res) => {
    try {
        const { initialCash, observations } = req.body;
        const user = req.user;
        
        // Usar o ID do usuário logado
        const userId = user.id;
        
        // Verificar se já existe caixa aberto hoje
        const today = new Date().toISOString().split('T')[0];
        let existingCashSql = `
            SELECT * FROM cash_control 
            WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
            AND (closing_date IS NULL OR closing_date = '')
            AND is_open = 1
        `;
        const existingCashParams = [today];
        
        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            existingCashSql += ` AND store_id = ?`;
            existingCashParams.push(user.store_id);
        }
        
        const existingCash = await db.get(existingCashSql, existingCashParams);
        
        if (existingCash) {
            return res.status(400).json({ error: 'Caixa já está aberto hoje' });
        }
        
        // Definir store_id automaticamente (exceto admin)
        const storeId = (user.role === 'admin' && req.body.store_id) ? req.body.store_id : user.store_id;
        
        // Criar novo registro de abertura
        const result = await db.run(
            `INSERT INTO cash_control (user_id, initial_cash, observations, opening_date, is_open, store_id)
             VALUES (?, ?, ?, datetime('now'), 1, ?)`,
            [userId, parseFloat(initialCash) || 0, observations || '', storeId || null]
        );
        
        res.json({
            success: true,
            id: result.lastID,
            message: 'Caixa aberto com sucesso'
        });
    } catch (error) {
        console.error('Erro ao abrir caixa:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Erro ao abrir caixa', details: error.message });
    }
});

// Fechar caixa
router.post('/close', auth, async (req, res) => {
    try {
        const { finalCash, observations } = req.body;
        const user = req.user;
        
        // Buscar o caixa aberto hoje
        const today = new Date().toISOString().split('T')[0];
        let cashControlSql = `
            SELECT * FROM cash_control 
            WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
            AND closing_date IS NULL 
            AND is_open = 1
        `;
        const cashControlParams = [today];
        
        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            cashControlSql += ` AND store_id = ?`;
            cashControlParams.push(user.store_id);
        }
        cashControlSql += ` ORDER BY opening_date DESC LIMIT 1`;
        
        const cashControl = await db.get(cashControlSql, cashControlParams);
        
        if (!cashControl) {
            return res.status(400).json({ error: 'Nenhum caixa aberto encontrado' });
        }
        
        // Buscar vendas do dia
        let todaySalesSql = `
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
            FROM sales 
            WHERE DATE(datetime(created_at, '-3 hours')) = ?
        `;
        const todaySalesParams = [today];
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            todaySalesSql += ` AND store_id = ?`;
            todaySalesParams.push(user.store_id);
        }
        const todaySales = await db.get(todaySalesSql, todaySalesParams);
        
        const expectedCash = (cashControl.initial_cash || 0) + parseFloat(todaySales?.total || 0);
        const difference = (finalCash || 0) - expectedCash;
        
        // Fechar o caixa
        await db.run(
            `UPDATE cash_control 
             SET final_cash = ?, 
                 closing_date = datetime('now'),
                 is_open = 0,
                 total_sales = ?,
                 difference = ?,
                 observations = COALESCE(?, observations)
             WHERE id = ?`,
            [finalCash || 0, parseFloat(todaySales?.total || 0), difference, observations || '', cashControl.id]
        );
        
        res.json({
            success: true,
            initialCash: cashControl.initial_cash || 0,
            todaySales: parseFloat(todaySales?.total || 0),
            finalCash: finalCash || 0,
            difference: difference,
            message: 'Caixa fechado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao fechar caixa:', error);
        res.status(500).json({ error: 'Erro ao fechar caixa', details: error.message });
    }
});

module.exports = router;

