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
            const storeIdNum = parseInt(store_id);
            storeFilter = ' AND CAST(store_id AS INTEGER) = ?';
            storeParams.push(storeIdNum);
            console.log('📌 Dashboard filtrando por store_id:', storeIdNum);
        } 
        // Se for admin/gerente e foi passado compare_stores, filtrar por múltiplas lojas
        // OU se não foi passado store_id (Todas as Lojas), buscar dados por loja para comparação
        let isComparing = false;
        let storeIdsForComparison = [];
        
        if ((user.role === 'admin' || user.role === 'gerente') && compare_stores) {
            storeIdsForComparison = compare_stores.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (storeIdsForComparison.length > 0) {
                storeFilter = ` AND CAST(store_id AS INTEGER) IN (${storeIdsForComparison.map(() => '?').join(',')})`;
                storeParams.push(...storeIdsForComparison);
                isComparing = true;
            }
        } else if ((user.role === 'admin' || user.role === 'gerente') && !store_id) {
            // Se "Todas as Lojas" foi selecionado, buscar todas as lojas ativas para comparação
            const allStores = await db.all('SELECT id, name FROM stores WHERE is_active = 1 ORDER BY name');
            storeIdsForComparison = allStores.map(s => s.id);
            isComparing = storeIdsForComparison.length > 1; // Só comparar se houver mais de uma loja
        }
        // Se não for admin/gerente, usar loja do usuário
        else if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            const userStoreIdNum = parseInt(user.store_id);
            storeFilter = ' AND CAST(store_id AS INTEGER) = ?';
            storeParams.push(userStoreIdNum);
            console.log('📌 Dashboard filtrando por store_id do usuário:', userStoreIdNum);
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

        // Produtos em estoque baixo (com lista) - respeitando filtro de loja e comparação
        let lowStockSql = `
            SELECT 
                p.id, 
                p.name, 
                p.barcode, 
                p.stock, 
                p.min_stock, 
                p.sale_price,
                p.store_id,
                s.name AS store_name
            FROM products p
            LEFT JOIN stores s ON s.id = p.store_id
            WHERE (p.stock <= p.min_stock OR p.stock = 0) 
              AND p.is_active = 1
        `;
        const lowStockParams = [];

        if (user.role === 'admin' || user.role === 'gerente') {
            if (isComparing && storeIdsForComparison.length > 0) {
                // Quando estiver comparando, trazer produtos apenas das lojas comparadas
                lowStockSql += ` AND CAST(p.store_id AS INTEGER) IN (${storeIdsForComparison.map(() => '?').join(',')})`;
                lowStockParams.push(...storeIdsForComparison);
            } else if (store_id) {
                // Quando uma loja específica foi selecionada
                lowStockSql += ` AND CAST(p.store_id AS INTEGER) = ?`;
                lowStockParams.push(parseInt(store_id));
            }
            // Caso admin/gerente com "Todas as Lojas" sem comparação explícita,
            // mantemos sem filtro de loja para mostrar visão geral da rede.
        } else if (user.store_id) {
            // Usuários comuns veem apenas a própria loja
            lowStockSql += ` AND CAST(p.store_id AS INTEGER) = ?`;
            lowStockParams.push(parseInt(user.store_id));
        }

        lowStockSql += ` ORDER BY p.stock ASC, p.name ASC LIMIT 50`;
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
                osSql += ` AND CAST(store_id AS INTEGER) = ?`;
                osParams.push(parseInt(user.store_id));
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

        // Se estiver comparando lojas, buscar dados separados por loja
        let comparisonData = null;
        if (isComparing && storeIdsForComparison.length > 0) {
            const storesInfo = await db.all(
                `SELECT id, name FROM stores WHERE id IN (${storeIdsForComparison.map(() => '?').join(',')}) ORDER BY name`,
                storeIdsForComparison
            );
            
            comparisonData = await Promise.all(storesInfo.map(async (store) => {
                const storeId = store.id;
                
                // Vendas do dia por loja
                const storeTodaySales = await db.get(
                    `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
                     FROM sales 
                     WHERE DATE(datetime(created_at, '-3 hours')) = ? AND CAST(store_id AS INTEGER) = ?`,
                    [today, parseInt(storeId)]
                );
                
                // Vendas do mês por loja
                const storeMonthSales = await db.get(
                    `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
                     FROM sales 
                     WHERE DATE(datetime(created_at, '-3 hours')) >= ? AND CAST(store_id AS INTEGER) = ?`,
                    [monthStart, parseInt(storeId)]
                );
                
                // Vendas por dia dos últimos 7 dias por loja
                const storeSalesByDay = await db.all(
                    `SELECT DATE(datetime(created_at, '-3 hours')) as date, 
                            COUNT(*) as count, 
                            COALESCE(SUM(total), 0) as total
                     FROM sales 
                     WHERE DATE(datetime(created_at, '-3 hours')) >= date('now', '-7 days') AND store_id = ?
                     GROUP BY DATE(datetime(created_at, '-3 hours'))
                     ORDER BY date ASC`,
                    [storeId]
                );
                
                // Vendas por forma de pagamento por loja
                const storeSalesByPayment = await db.all(
                    `SELECT payment_method, 
                            COUNT(*) as count, 
                            COALESCE(SUM(total), 0) as total
                     FROM sales 
                     WHERE DATE(datetime(created_at, '-3 hours')) >= date('now', '-30 days') AND store_id = ?
                     GROUP BY payment_method
                     ORDER BY total DESC`,
                    [storeId]
                );
                
                // OS por status por loja
                const storeOSByStatus = {};
                for (const status of osStatuses) {
                    const result = await db.get(
                        `SELECT COUNT(*) as count FROM service_orders WHERE status = ? AND store_id = ?`,
                        [status, storeId]
                    );
                    storeOSByStatus[status] = result.count;
                }
                
                return {
                    storeId: store.id,
                    storeName: store.name,
                    sales: {
                        today: storeTodaySales,
                        month: storeMonthSales,
                        byDay: storeSalesByDay,
                        byPayment: storeSalesByPayment
                    },
                    serviceOrders: storeOSByStatus
                };
            }));
        }

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
            serviceOrders: osByStatus,
            comparison: comparisonData // Dados separados por loja para comparação
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

            case 'returns':
                try {
                    // Verificar se a tabela returns existe
                    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='returns'");
                    if (!tableExists) {
                        console.warn('⚠️ Tabela returns não existe. Retornando array vazio.');
                        return res.json({ type: 'returns', data: [] });
                    }

                    console.log('📊 Gerando relatório de devoluções para período:', startDate, 'a', endDate);
                    const returnsReport = await db.all(
                        `SELECT r.*,
                                s.sale_number,
                                s.payment_method as original_payment_method,
                                s.installments,
                                p.name as product_name,
                                p.barcode as product_barcode,
                                c.name as customer_name,
                                c.cpf_cnpj as customer_document,
                                c.document,
                                st.name as store_name,
                                rp.name as replacement_product_name,
                                rp.barcode as replacement_product_barcode,
                                u.name as processed_by_name
                         FROM returns r
                         LEFT JOIN sales s ON r.sale_id = s.id
                         LEFT JOIN products p ON r.product_id = p.id
                         LEFT JOIN customers c ON r.customer_id = c.id
                         LEFT JOIN stores st ON r.store_id = st.id
                         LEFT JOIN products rp ON r.replacement_product_id = rp.id
                         LEFT JOIN users u ON r.processed_by = u.id
                         WHERE DATE(datetime(r.created_at, '-3 hours')) >= ? 
                         AND DATE(datetime(r.created_at, '-3 hours')) <= ?
                         ORDER BY r.created_at DESC`,
                        [startDate, endDate]
                    );
                    console.log('✅ Relatório de devoluções gerado com sucesso:', returnsReport ? returnsReport.length : 0, 'itens');
                    return res.json({ type: 'returns', data: returnsReport || [] });
                } catch (returnsError) {
                    console.error('❌ Erro ao gerar relatório de devoluções:', returnsError);
                    console.error('❌ Mensagem:', returnsError.message);
                    console.error('❌ Stack:', returnsError.stack);
                    // Retornar array vazio em caso de erro para não quebrar a interface
                    return res.json({ type: 'returns', data: [] });
                }

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
        const { date, store_id } = req.query;
        const user = req.user;
        
        // Usar data atual no timezone do Brasil (UTC-3)
        const now = new Date();
        const brazilOffset = -3 * 60; // UTC-3 em minutos
        const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60 * 1000);
        const targetDate = date || brazilTime.toISOString().split('T')[0];
        
        console.log(`📅 Buscando vendas para a data: ${targetDate}, store_id: ${store_id || 'todas'}`);
        
        // Construir filtro de loja
        let storeFilter = '';
        const storeParams = [];
        
        // Se for admin/gerente e foi passado store_id, usar esse
        if ((user.role === 'admin' || user.role === 'gerente') && store_id) {
            const storeIdNum = parseInt(store_id);
            storeFilter = ' AND CAST(store_id AS INTEGER) = ?';
            storeParams.push(storeIdNum);
            console.log('📌 Today-sales filtrando por store_id:', storeIdNum);
        }
        // Se não for admin/gerente, usar loja do usuário
        else if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            const userStoreIdNum = parseInt(user.store_id);
            storeFilter = ' AND CAST(store_id AS INTEGER) = ?';
            storeParams.push(userStoreIdNum);
            console.log('📌 Today-sales filtrando por store_id do usuário:', userStoreIdNum);
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








