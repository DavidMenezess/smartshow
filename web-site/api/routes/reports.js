// ========================================
// ROTAS DE RELATÓRIOS
// ========================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// Dashboard - resumo geral
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Vendas do dia
        const todaySales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales WHERE DATE(created_at) = ?`,
            [today]
        );

        // Vendas do mês
        const monthSales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales WHERE DATE(created_at) >= ?`,
            [monthStart]
        );

        // Produtos em estoque baixo (com lista)
        const lowStockProducts = await db.all(
            `SELECT id, name, barcode, stock, min_stock, sale_price
             FROM products 
             WHERE (stock <= min_stock OR stock = 0) AND is_active = 1
             ORDER BY stock ASC, name ASC
             LIMIT 20`
        );

        // Contas a receber
        const receivable = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as total
             FROM accounts_receivable WHERE status = 'pending'`
        );

        // Contas a pagar
        const payable = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as total
             FROM accounts_payable WHERE status = 'pending'`
        );

        // Ordens de serviço por status
        const osStatuses = ['pronta', 'aguardando_autorizacao', 'sem_concerto', 'entregue', 'em_manutencao', 'aguardando_peca'];
        const osByStatus = {};
        
        for (const status of osStatuses) {
            const result = await db.get(
                `SELECT COUNT(*) as count FROM service_orders WHERE status = ?`,
                [status]
            );
            osByStatus[status] = result.count;
        }

        // Vendas por dia dos últimos 7 dias (para gráfico)
        const salesByDay = await db.all(
            `SELECT DATE(created_at) as date, 
                    COUNT(*) as count, 
                    COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(created_at) >= date('now', '-7 days')
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );

        // Vendas por forma de pagamento (últimos 30 dias)
        const salesByPayment = await db.all(
            `SELECT payment_method, 
                    COUNT(*) as count, 
                    COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(created_at) >= date('now', '-30 days')
             GROUP BY payment_method
             ORDER BY total DESC`
        );

        res.json({
            sales: {
                today: todaySales,
                month: monthSales,
                byDay: salesByDay,
                byPayment: salesByPayment
            },
            stock: {
                lowStock: lowStockProducts.length,
                products: lowStockProducts
            },
            financial: {
                receivable,
                payable
            },
            serviceOrders: osByStatus
        });
    } catch (error) {
        console.error('Erro ao gerar dashboard:', error);
        res.status(500).json({ error: 'Erro ao gerar dashboard' });
    }
});

// Relatório de vendas
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let sql = `
            SELECT DATE(s.created_at) as date,
                   COUNT(*) as sales_count,
                   SUM(s.total) as total_sales,
                   SUM(s.discount) as total_discount
            FROM sales s
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            sql += ` AND DATE(s.created_at) >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            sql += ` AND DATE(s.created_at) <= ?`;
            params.push(endDate);
        }

        sql += ` GROUP BY DATE(s.created_at) ORDER BY date DESC`;

        const report = await db.all(sql, params);
        res.json(report);
    } catch (error) {
        console.error('Erro ao gerar relatório de vendas:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de vendas' });
    }
});

// Relatório de produtos mais vendidos
router.get('/products/top-sellers', async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        
        let sql = `
            SELECT p.id, p.name, p.barcode,
                   SUM(si.quantity) as total_quantity,
                   SUM(si.total) as total_revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            sql += ` AND DATE(s.created_at) >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            sql += ` AND DATE(s.created_at) <= ?`;
            params.push(endDate);
        }

        sql += ` GROUP BY p.id ORDER BY total_quantity DESC LIMIT ?`;
        params.push(parseInt(limit));

        const report = await db.all(sql, params);
        res.json(report);
    } catch (error) {
        console.error('Erro ao gerar relatório de produtos:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de produtos' });
    }
});

module.exports = router;








