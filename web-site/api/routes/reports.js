// ========================================
// ROTAS DE RELATÓRIOS
// ========================================

const express = require('express');
const db = require('../database');

const router = express.Router();

// Dashboard - resumo geral
router.get('/dashboard', async (req, res) => {
    try {
        // Usar data atual no timezone do Brasil (UTC-3)
        const now = new Date();
        const brazilOffset = -3 * 60; // UTC-3 em minutos
        const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60 * 1000);
        const today = brazilTime.toISOString().split('T')[0];
        
        const monthStart = new Date(brazilTime.getFullYear(), brazilTime.getMonth(), 1).toISOString().split('T')[0];

        // Vendas do dia - considerar timezone do Brasil
        const todaySales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) = ?`,
            [today]
        );

        // Vendas do mês - considerar timezone do Brasil
        const monthSales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) >= ?`,
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

        // Vendas por dia dos últimos 7 dias (para gráfico) - considerar timezone do Brasil
        const salesByDay = await db.all(
            `SELECT DATE(datetime(created_at, '-3 hours')) as date, 
                    COUNT(*) as count, 
                    COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) >= date('now', '-7 days')
             GROUP BY DATE(datetime(created_at, '-3 hours'))
             ORDER BY date ASC`
        );

        // Vendas por forma de pagamento (últimos 30 dias) - considerar timezone do Brasil
        const salesByPayment = await db.all(
            `SELECT payment_method, 
                    COUNT(*) as count, 
                    COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) >= date('now', '-30 days')
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

// Relatório genérico (compatibilidade com frontend)
router.get('/', async (req, res) => {
    try {
        const { type, start, end } = req.query;
        const startDate = start;
        const endDate = end;

        if (!type) {
            return res.status(400).json({ error: 'Tipo de relatório é obrigatório' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Período é obrigatório' });
        }

        switch (type) {
            case 'sales':
                const salesReport = await db.all(
                    `SELECT DATE(datetime(s.created_at, '-3 hours')) as date,
                            COUNT(*) as sales_count,
                            SUM(s.total) as total_sales,
                            SUM(s.discount) as total_discount
                     FROM sales s
                     WHERE DATE(datetime(s.created_at, '-3 hours')) >= ? 
                     AND DATE(datetime(s.created_at, '-3 hours')) <= ?
                     GROUP BY DATE(datetime(s.created_at, '-3 hours'))
                     ORDER BY date DESC`,
                    [startDate, endDate]
                );
                return res.json({ type: 'sales', data: salesReport });

            case 'products':
                const productsReport = await db.all(
                    `SELECT p.id, p.name, p.barcode,
                           SUM(si.quantity) as total_quantity,
                           SUM(si.total) as total_revenue
                    FROM sale_items si
                    JOIN products p ON si.product_id = p.id
                    JOIN sales s ON si.sale_id = s.id
                    WHERE DATE(datetime(s.created_at, '-3 hours')) >= ? 
                    AND DATE(datetime(s.created_at, '-3 hours')) <= ?
                    GROUP BY p.id
                    ORDER BY total_quantity DESC
                    LIMIT 50`,
                    [startDate, endDate]
                );
                return res.json({ type: 'products', data: productsReport });

            case 'customers':
                const customersReport = await db.all(
                    `SELECT c.id, c.name, c.cpf_cnpj,
                           COUNT(s.id) as total_sales,
                           SUM(s.total) as total_revenue
                    FROM customers c
                    LEFT JOIN sales s ON c.id = s.customer_id
                    WHERE (s.id IS NULL OR (DATE(datetime(s.created_at, '-3 hours')) >= ? 
                    AND DATE(datetime(s.created_at, '-3 hours')) <= ?))
                    GROUP BY c.id
                    ORDER BY total_revenue DESC
                    LIMIT 50`,
                    [startDate, endDate]
                );
                return res.json({ type: 'customers', data: customersReport });

            case 'financial':
                const financialReport = await db.all(
                    `SELECT 'receivable' as type, COUNT(*) as count, 
                            COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as total
                     FROM accounts_receivable
                     WHERE due_date >= ? AND due_date <= ?
                     UNION ALL
                     SELECT 'payable' as type, COUNT(*) as count,
                            COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as total
                     FROM accounts_payable
                     WHERE due_date >= ? AND due_date <= ?`,
                    [startDate, endDate, startDate, endDate]
                );
                return res.json({ type: 'financial', data: financialReport });

            case 'service':
                const serviceReport = await db.all(
                    `SELECT status, COUNT(*) as count,
                            COALESCE(SUM(total_value), 0) as total_value
                     FROM service_orders
                     WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
                     GROUP BY status`,
                    [startDate, endDate]
                );
                return res.json({ type: 'service', data: serviceReport });

            default:
                return res.status(400).json({ error: 'Tipo de relatório inválido' });
        }
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório', details: error.message });
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

// Vendas do dia (para o caixa)
router.get('/today-sales', async (req, res) => {
    try {
        const { date } = req.query;
        
        // Usar data atual no timezone do Brasil (UTC-3)
        const now = new Date();
        const brazilOffset = -3 * 60; // UTC-3 em minutos
        const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60 * 1000);
        const targetDate = date || brazilTime.toISOString().split('T')[0];
        
        console.log(`📅 Buscando vendas para a data: ${targetDate}`);
        
        // Usar timezone do Brasil (UTC-3)
        const todaySales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) = ?`,
            [targetDate]
        );
        
        const result = todaySales || { count: 0, total: 0 };
        console.log(`💰 Vendas encontradas: ${result.count} vendas, Total: R$ ${result.total}`);
        
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao buscar vendas do dia:', error);
        res.status(500).json({ error: 'Erro ao buscar vendas do dia', details: error.message });
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








