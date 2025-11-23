// ========================================
// ROTAS FINANCEIRAS
// ========================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// Contas a receber
router.get('/receivable', async (req, res) => {
    try {
        const { status, customerId } = req.query;
        
        let sql = `
            SELECT ar.*, c.name as customer_name
            FROM accounts_receivable ar
            LEFT JOIN customers c ON ar.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ` AND ar.status = ?`;
            params.push(status);
        }

        if (customerId) {
            sql += ` AND ar.customer_id = ?`;
            params.push(customerId);
        }

        sql += ` ORDER BY ar.due_date`;

        const accounts = await db.all(sql, params);
        res.json(accounts);
    } catch (error) {
        console.error('Erro ao listar contas a receber:', error);
        res.status(500).json({ error: 'Erro ao listar contas a receber' });
    }
});

// Contas a pagar
router.get('/payable', async (req, res) => {
    try {
        const { status, supplierId } = req.query;
        
        let sql = `
            SELECT ap.*, s.name as supplier_name
            FROM accounts_payable ap
            LEFT JOIN suppliers s ON ap.supplier_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ` AND ap.status = ?`;
            params.push(status);
        }

        if (supplierId) {
            sql += ` AND ap.supplier_id = ?`;
            params.push(supplierId);
        }

        sql += ` ORDER BY ap.due_date`;

        const accounts = await db.all(sql, params);
        res.json(accounts);
    } catch (error) {
        console.error('Erro ao listar contas a pagar:', error);
        res.status(500).json({ error: 'Erro ao listar contas a pagar' });
    }
});

// Criar conta a receber
router.post('/receivable', async (req, res) => {
    try {
        const { saleId, serviceOrderId, customerId, description, dueDate, amount } = req.body;

        if (!customerId || !dueDate || !amount) {
            return res.status(400).json({ error: 'Cliente, data de vencimento e valor são obrigatórios' });
        }

        const result = await db.run(
            `INSERT INTO accounts_receivable 
             (sale_id, service_order_id, customer_id, description, due_date, amount)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [saleId || null, serviceOrderId || null, customerId, description || null, dueDate, amount]
        );

        const account = await db.get('SELECT * FROM accounts_receivable WHERE id = ?', [result.lastID]);
        res.status(201).json(account);
    } catch (error) {
        console.error('Erro ao criar conta a receber:', error);
        res.status(500).json({ error: 'Erro ao criar conta a receber' });
    }
});

// Pagar conta
router.post('/pay/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, paymentMethod, paymentDate } = req.body;

        const account = await db.get('SELECT * FROM accounts_receivable WHERE id = ?', [id]);
        if (!account) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        const paidAmount = (account.paid_amount || 0) + (amount || account.amount);
        const status = paidAmount >= account.amount ? 'paid' : 'pending';

        await db.run(
            `UPDATE accounts_receivable SET
             paid_amount = ?, status = ?, payment_date = ?, payment_method = ?
             WHERE id = ?`,
            [paidAmount, status, paymentDate || new Date().toISOString().split('T')[0], paymentMethod || null, id]
        );

        const updated = await db.get('SELECT * FROM accounts_receivable WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        console.error('Erro ao pagar conta:', error);
        res.status(500).json({ error: 'Erro ao pagar conta' });
    }
});

module.exports = router;




