// ========================================
// ROTAS DE RELATÓRIOS
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Dashboard - resumo geral
router.get('/dashboard', auth, async (req, res) => {
    try {
        const user = req.user;
        const { store_id, compare_stores } = req.query;
        
        // Usar data atual no timezone do Brasil (UTC-3)
        const now = new Date();
        const brazilOffset = -3 * 60; // UTC-3 em minutos
        const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60 * 1000);
        const today = brazilTime.toISOString().split('T')[0];
        
        const monthStart = new Date(brazilTime.getFullYear(), brazilTime.getMonth(), 1).toISOString().split('T')[0];

        // Construir filtro de loja
        let storeFilter = '';
        const storeParams = [];
        
        // Se for admin/gerente e foi passado store_id, usar esse
        if ((user.role === 'admin' || user.role === 'gerente') && store_id) {
            storeFilter = ' AND store_id = ?';
            storeParams.push(parseInt(store_id));
        } 
        // Se for admin/gerente e foi passado compare_stores, filtrar por múltiplas lojas
        else if ((user.role === 'admin' || user.role === 'gerente') && compare_stores) {
            const storeIds = compare_stores.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (storeIds.length > 0) {
                storeFilter = ` AND store_id IN (${storeIds.map(() => '?').join(',')})`;
                storeParams.push(...storeIds);
            }
        }
        // Se não for admin/gerente, usar loja do usuário
        else if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            storeFilter = ' AND store_id = ?';
            storeParams.push(user.store_id);
        }

        // Vendas do dia - considerar timezone do Brasil
        const todaySales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) = ?${storeFilter}`,
            [today, ...storeParams]
        );

        // Vendas do mês - considerar timezone do Brasil
        const monthSales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) >= ?${storeFilter}`,
            [monthStart, ...storeParams]
        );

        // Produtos em estoque baixo (com lista)
        let lowStockSql = `
            SELECT id, name, barcode, stock, min_stock, sale_price
            FROM products 
            WHERE (stock <= min_stock OR stock = 0) AND is_active = 1
        `;
        const lowStockParams = [];
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            lowStockSql += ` AND store_id = ?`;
            lowStockParams.push(user.store_id);
        }
        lowStockSql += ` ORDER BY stock ASC, name ASC LIMIT 20`;
        const lowStockProducts = await db.all(lowStockSql, lowStockParams);

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
            let osSql = `SELECT COUNT(*) as count FROM service_orders WHERE status = ?`;
            const osParams = [status];
            if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
                osSql += ` AND store_id = ?`;
                osParams.push(user.store_id);
            }
            const result = await db.get(osSql, osParams);
            osByStatus[status] = result.count;
        }

        // Vendas por dia dos últimos 7 dias (para gráfico) - considerar timezone do Brasil
        const salesByDay = await db.all(
            `SELECT DATE(datetime(created_at, '-3 hours')) as date, 
                    COUNT(*) as count, 
                    COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) >= date('now', '-7 days')${storeFilter}
             GROUP BY DATE(datetime(created_at, '-3 hours'))
             ORDER BY date ASC`,
            storeParams
        );

        // Vendas por forma de pagamento (últimos 30 dias) - considerar timezone do Brasil
        const salesByPayment = await db.all(
            `SELECT payment_method, 
                    COUNT(*) as count, 
                    COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) >= date('now', '-30 days')${storeFilter}
             GROUP BY payment_method
             ORDER BY total DESC`,
            storeParams
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
router.get('/', auth, async (req, res) => {
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
                // Buscar vendas individuais com todos os detalhes
                const salesReport = await db.all(
                    `SELECT 
                        s.id,
                        s.sale_number,
                        datetime(s.created_at, '-3 hours') as date_time,
                        DATE(datetime(s.created_at, '-3 hours')) as date,
                        TIME(datetime(s.created_at, '-3 hours')) as time,
                        s.total,
                        s.discount,
                        s.payment_method,
                        s.installments,
                        s.observations,
                        u.name as seller_name,
                        u.username as seller_username,
                        COALESCE(c.name, 'Cliente não informado') as customer_name,
                        c.cpf_cnpj as customer_document
                     FROM sales s
                     LEFT JOIN users u ON s.seller_id = u.id
                     LEFT JOIN customers c ON s.customer_id = c.id
                     WHERE DATE(datetime(s.created_at, '-3 hours')) >= ? 
                     AND DATE(datetime(s.created_at, '-3 hours')) <= ?
                     ORDER BY s.created_at DESC`,
                    [startDate, endDate]
                );
                
                // Buscar itens detalhados de cada venda
                const salesWithItems = await Promise.all(salesReport.map(async (sale) => {
                    const items = await db.all(
                        `SELECT 
                            si.quantity,
                            si.unit_price,
                            si.total as item_total,
                            p.name as product_name,
                            p.barcode
                         FROM sale_items si
                         JOIN products p ON si.product_id = p.id
                         WHERE si.sale_id = ?
                         ORDER BY si.id`,
                        [sale.id]
                    );
                    return {
                        ...sale,
                        items: items
                    };
                }));
                
                return res.json({ type: 'sales', data: salesWithItems });

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
                // Buscar clientes com suas vendas no período
                const customersReport = await db.all(
                    `SELECT DISTINCT
                        c.id,
                        c.name,
                        c.cpf_cnpj,
                        c.phone,
                        c.email
                     FROM customers c
                     JOIN sales s ON c.id = s.customer_id
                     WHERE DATE(datetime(s.created_at, '-3 hours')) >= ? 
                     AND DATE(datetime(s.created_at, '-3 hours')) <= ?
                     ORDER BY c.name`,
                    [startDate, endDate]
                );
                
                // Para cada cliente, buscar suas vendas detalhadas
                const customersWithSales = await Promise.all(customersReport.map(async (customer) => {
                    const sales = await db.all(
                        `SELECT 
                            s.id,
                            s.sale_number,
                            datetime(s.created_at, '-3 hours') as date_time,
                            s.total,
                            s.discount,
                            s.payment_method,
                            s.installments,
                            u.name as seller_name
                         FROM sales s
                         LEFT JOIN users u ON s.seller_id = u.id
                         WHERE s.customer_id = ?
                         AND DATE(datetime(s.created_at, '-3 hours')) >= ? 
                         AND DATE(datetime(s.created_at, '-3 hours')) <= ?
                         ORDER BY s.created_at DESC`,
                        [customer.id, startDate, endDate]
                    );
                    
                    // Para cada venda, buscar os produtos
                    const salesWithItems = await Promise.all(sales.map(async (sale) => {
                        const items = await db.all(
                            `SELECT 
                                si.quantity,
                                si.unit_price,
                                si.total as item_total,
                                p.name as product_name,
                                p.barcode
                             FROM sale_items si
                             JOIN products p ON si.product_id = p.id
                             WHERE si.sale_id = ?
                             ORDER BY si.id`,
                            [sale.id]
                        );
                        return {
                            ...sale,
                            items: items
                        };
                    }));
                    
                    const totalRevenue = sales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
                    const totalSales = sales.length;
                    
                    return {
                        ...customer,
                        total_sales: totalSales,
                        total_revenue: totalRevenue,
                        sales: salesWithItems
                    };
                }));
                
                // Ordenar por receita total
                customersWithSales.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
                
                return res.json({ type: 'customers', data: customersWithSales });

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
router.get('/today-sales', auth, async (req, res) => {
    try {
        const { date } = req.query;
        const user = req.user;
        
        // Usar data atual no timezone do Brasil (UTC-3)
        const now = new Date();
        const brazilOffset = -3 * 60; // UTC-3 em minutos
        const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60 * 1000);
        const targetDate = date || brazilTime.toISOString().split('T')[0];
        
        console.log(`📅 Buscando vendas para a data: ${targetDate}`);
        
        // Construir filtro de loja
        let storeFilter = '';
        const storeParams = [];
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            storeFilter = ' AND store_id = ?';
            storeParams.push(user.store_id);
        }
        
        // Usar timezone do Brasil (UTC-3)
        const todaySales = await db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales 
             WHERE DATE(datetime(created_at, '-3 hours')) = ?${storeFilter}`,
            [targetDate, ...storeParams]
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








