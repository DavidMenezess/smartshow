// ========================================
// ROTAS DE IMPORTAÇÃO E EXPORTAÇÃO DE DADOS
// ========================================

const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '../../uploads/');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para upload de arquivos
const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.json') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos JSON são permitidos'));
        }
    }
});

// ========================================
// EXPORTAR DADOS
// ========================================

router.get('/export', auth, async (req, res) => {
    try {
        const { store_id, types } = req.query;
        const user = req.user;

        // Verificar permissão (apenas admin pode exportar todos os dados)
        if (!store_id && user.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas administradores podem exportar todos os dados' });
        }

        // Parsear tipos de dados solicitados
        const requestedTypes = types ? types.split(',') : [
            'stores', 'products', 'customers', 'sales', 'service_orders',
            'categories', 'suppliers', 'accounts_receivable', 'accounts_payable', 'stock_movements'
        ];

        const exportData = {
            version: '1.0',
            export_date: new Date().toISOString(),
            exported_by: user.name || user.username,
            stores: [],
            products: [],
            customers: [],
            sales: [],
            sale_items: [],
            service_orders: [],
            categories: [],
            suppliers: [],
            accounts_receivable: [],
            accounts_payable: [],
            stock_movements: []
        };

        // Exportar lojas
        if (requestedTypes.includes('stores')) {
            if (store_id) {
                const store = await db.get('SELECT * FROM stores WHERE id = ?', [store_id]);
                if (store) {
                    exportData.stores.push(store);
                }
            } else {
                const stores = await db.all('SELECT * FROM stores');
                exportData.stores = stores;
            }
        }

        // Exportar categorias
        if (requestedTypes.includes('categories')) {
            const categories = await db.all('SELECT * FROM categories');
            exportData.categories = categories;
        }

        // Exportar fornecedores
        if (requestedTypes.includes('suppliers')) {
            const suppliers = await db.all('SELECT * FROM suppliers');
            exportData.suppliers = suppliers;
        }

        // Exportar produtos
        if (requestedTypes.includes('products')) {
            if (store_id) {
                const products = await db.all('SELECT * FROM products WHERE store_id = ?', [store_id]);
                exportData.products = products;
            } else {
                const products = await db.all('SELECT * FROM products');
                exportData.products = products;
            }
        }

        // Exportar clientes
        if (requestedTypes.includes('customers')) {
            if (store_id) {
                const customers = await db.all('SELECT * FROM customers WHERE store_id = ?', [store_id]);
                exportData.customers = customers;
            } else {
                const customers = await db.all('SELECT * FROM customers');
                exportData.customers = customers;
            }
        }

        // Exportar vendas
        if (requestedTypes.includes('sales')) {
            if (store_id) {
                const sales = await db.all('SELECT * FROM sales WHERE store_id = ?', [store_id]);
                exportData.sales = sales;

                // Exportar itens de venda
                if (sales.length > 0) {
                    const saleIds = sales.map(s => s.id);
                    const placeholders = saleIds.map(() => '?').join(',');
                    const saleItems = await db.all(
                        `SELECT * FROM sale_items WHERE sale_id IN (${placeholders})`,
                        saleIds
                    );
                    exportData.sale_items = saleItems;
                }
            } else {
                const sales = await db.all('SELECT * FROM sales');
                exportData.sales = sales;

                if (sales.length > 0) {
                    const saleIds = sales.map(s => s.id);
                    const placeholders = saleIds.map(() => '?').join(',');
                    const saleItems = await db.all(
                        `SELECT * FROM sale_items WHERE sale_id IN (${placeholders})`,
                        saleIds
                    );
                    exportData.sale_items = saleItems;
                }
            }
        }

        // Exportar ordens de serviço
        if (requestedTypes.includes('service_orders')) {
            if (store_id) {
                const serviceOrders = await db.all('SELECT * FROM service_orders WHERE store_id = ?', [store_id]);
                exportData.service_orders = serviceOrders;
            } else {
                const serviceOrders = await db.all('SELECT * FROM service_orders');
                exportData.service_orders = serviceOrders;
            }
        }

        // Exportar contas a receber
        if (requestedTypes.includes('accounts_receivable')) {
            if (store_id) {
                const receivables = await db.all(
                    `SELECT ar.* FROM accounts_receivable ar
                     LEFT JOIN sales s ON ar.sale_id = s.id
                     LEFT JOIN service_orders so ON ar.service_order_id = so.id
                     WHERE s.store_id = ? OR so.store_id = ?`,
                    [store_id, store_id]
                );
                exportData.accounts_receivable = receivables;
            } else {
                const receivables = await db.all('SELECT * FROM accounts_receivable');
                exportData.accounts_receivable = receivables;
            }
        }

        // Exportar contas a pagar
        if (requestedTypes.includes('accounts_payable')) {
            const payables = await db.all('SELECT * FROM accounts_payable');
            exportData.accounts_payable = payables;
        }

        // Exportar movimentações de estoque
        if (requestedTypes.includes('stock_movements')) {
            if (store_id) {
                const stockMovements = await db.all(
                    `SELECT sm.* FROM stock_movements sm
                     INNER JOIN products p ON sm.product_id = p.id
                     WHERE p.store_id = ?`,
                    [store_id]
                );
                exportData.stock_movements = stockMovements;
            } else {
                const stockMovements = await db.all('SELECT * FROM stock_movements');
                exportData.stock_movements = stockMovements;
            }
        }

        // Definir nome do arquivo
        const filename = store_id 
            ? `smartshow_export_loja_${store_id}_${Date.now()}.json`
            : `smartshow_export_completo_${Date.now()}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(exportData);

    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        res.status(500).json({ error: 'Erro ao exportar dados', details: error.message });
    }
});

// ========================================
// IMPORTAR DADOS
// ========================================

router.post('/import', auth, upload.single('file'), async (req, res) => {
    try {
        // Verificar permissão (apenas admin pode importar)
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas administradores podem importar dados' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
        }

        // Obter loja de destino (se especificada)
        const targetStoreId = req.body.target_store_id ? parseInt(req.body.target_store_id) : null;
        
        // Obter tipos de dados solicitados
        const requestedTypes = req.body.types ? req.body.types.split(',') : [
            'stores', 'products', 'customers', 'sales', 'service_orders',
            'categories', 'suppliers', 'accounts_receivable', 'accounts_payable', 'stock_movements'
        ];
        
        // Validar loja de destino se fornecida
        if (targetStoreId) {
            const targetStore = await db.get('SELECT id FROM stores WHERE id = ?', [targetStoreId]);
            if (!targetStore) {
                return res.status(400).json({ error: 'Loja de destino não encontrada' });
            }
        }

        // Ler arquivo JSON
        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let importData;
        
        try {
            importData = JSON.parse(fileContent);
        } catch (parseError) {
            return res.status(400).json({ error: 'Arquivo JSON inválido ou corrompido' });
        }

        // Validar estrutura básica (aceitar arquivos sem versão para compatibilidade com sistemas antigos)
        if (!importData.stores && !importData.products && !importData.customers) {
            return res.status(400).json({ error: 'Arquivo inválido: estrutura de dados não reconhecida' });
        }

        const results = {
            stores: { created: 0, updated: 0, errors: [] },
            categories: { created: 0, updated: 0, errors: [] },
            suppliers: { created: 0, updated: 0, errors: [] },
            products: { created: 0, updated: 0, errors: [] },
            customers: { created: 0, updated: 0, errors: [] },
            sales: { created: 0, updated: 0, errors: [] },
            service_orders: { created: 0, updated: 0, errors: [] },
            accounts_receivable: { created: 0, updated: 0, errors: [] },
            accounts_payable: { created: 0, updated: 0, errors: [] }
        };

        // Mapeamento de IDs antigos para novos (para relacionamentos)
        const idMapping = {
            stores: {},
            categories: {},
            suppliers: {},
            products: {},
            customers: {},
            users: {},
            sales: {}
        };

        // 1. Importar lojas primeiro (necessário para relacionamentos)
        // Se targetStoreId foi fornecido, mapear todas as lojas do arquivo para essa loja
        if (requestedTypes.includes('stores')) {
            if (targetStoreId) {
                if (importData.stores && Array.isArray(importData.stores)) {
                    for (const store of importData.stores) {
                        // Mapear todas as lojas do arquivo para a loja de destino
                        idMapping.stores[store.id] = targetStoreId;
                    }
                }
            } else {
                // Importar lojas normalmente quando não há loja de destino especificada
                if (importData.stores && Array.isArray(importData.stores)) {
                    for (const store of importData.stores) {
                        try {
                            // Verificar se loja já existe pelo nome
                            const existing = await db.get('SELECT id FROM stores WHERE name = ?', [store.name]);
                            
                            if (existing) {
                                // Atualizar loja existente
                                await db.run(
                                    `UPDATE stores SET 
                                        address = ?, city = ?, state = ?, phone = ?, email = ?, is_active = ?
                                     WHERE id = ?`,
                                    [
                                        store.address || null,
                                        store.city || null,
                                        store.state || null,
                                        store.phone || null,
                                        store.email || null,
                                        store.is_active !== undefined ? store.is_active : 1,
                                        existing.id
                                    ]
                                );
                                idMapping.stores[store.id] = existing.id;
                                results.stores.updated++;
                            } else {
                                // Criar nova loja
                                const result = await db.run(
                                    `INSERT INTO stores (name, address, city, state, phone, email, is_active)
                                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        store.name,
                                        store.address || null,
                                        store.city || null,
                                        store.state || null,
                                        store.phone || null,
                                        store.email || null,
                                        store.is_active !== undefined ? store.is_active : 1
                                    ]
                                );
                                idMapping.stores[store.id] = result.lastID;
                                results.stores.created++;
                            }
                        } catch (error) {
                            results.stores.errors.push({ store: store.name, error: error.message });
                        }
                    }
                }
            }
        }

        // 2. Importar categorias
        if (importData.categories && Array.isArray(importData.categories)) {
            for (const category of importData.categories) {
                try {
                    const existing = await db.get('SELECT id FROM categories WHERE name = ?', [category.name]);
                    
                    if (existing) {
                        idMapping.categories[category.id] = existing.id;
                        results.categories.updated++;
                    } else {
                        const result = await db.run(
                            `INSERT INTO categories (name, description) VALUES (?, ?)`,
                            [category.name, category.description || null]
                        );
                        idMapping.categories[category.id] = result.lastID;
                        results.categories.created++;
                    }
                } catch (error) {
                    results.categories.errors.push({ category: category.name, error: error.message });
                }
            }
        }

        // 3. Importar fornecedores
        if (requestedTypes.includes('suppliers') && importData.suppliers && Array.isArray(importData.suppliers)) {
            for (const supplier of importData.suppliers) {
                try {
                    const existing = await db.get('SELECT id FROM suppliers WHERE name = ?', [supplier.name]);
                    
                    if (existing) {
                        idMapping.suppliers[supplier.id] = existing.id;
                        results.suppliers.updated++;
                    } else {
                        const result = await db.run(
                            `INSERT INTO suppliers (name, cnpj, phone, email, address)
                             VALUES (?, ?, ?, ?, ?)`,
                            [
                                supplier.name,
                                supplier.cnpj || null,
                                supplier.phone || null,
                                supplier.email || null,
                                supplier.address || null
                            ]
                        );
                        idMapping.suppliers[supplier.id] = result.lastID;
                        results.suppliers.created++;
                    }
                } catch (error) {
                    results.suppliers.errors.push({ supplier: supplier.name, error: error.message });
                }
            }
        }

        // 4. Importar produtos
        if (requestedTypes.includes('products') && importData.products && Array.isArray(importData.products)) {
            for (const product of importData.products) {
                try {
                    // Mapear store_id (usar targetStoreId se fornecido, senão usar do arquivo)
                    const newStoreId = targetStoreId || (product.store_id ? idMapping.stores[product.store_id] || product.store_id : null);
                    const newCategoryId = product.category_id ? idMapping.categories[product.category_id] || product.category_id : null;
                    const newSupplierId = product.supplier_id ? idMapping.suppliers[product.supplier_id] || product.supplier_id : null;

                    // Verificar se produto já existe pelo código de barras ou nome
                    let existing = null;
                    if (product.barcode) {
                        existing = await db.get('SELECT id FROM products WHERE barcode = ?', [product.barcode]);
                    }
                    if (!existing) {
                        existing = await db.get('SELECT id FROM products WHERE name = ? AND store_id = ?', [product.name, newStoreId]);
                    }

                    if (existing) {
                        // Atualizar produto existente
                        await db.run(
                            `UPDATE products SET
                                name = ?, description = ?, category_id = ?, supplier_id = ?,
                                brand = ?, model = ?, cost_price = ?, sale_price = ?,
                                stock = ?, min_stock = ?, is_active = ?
                             WHERE id = ?`,
                            [
                                product.name,
                                product.description || null,
                                newCategoryId,
                                newSupplierId,
                                product.brand || null,
                                product.model || null,
                                product.cost_price || 0,
                                product.sale_price || 0,
                                product.stock || 0,
                                product.min_stock || 0,
                                product.is_active !== undefined ? product.is_active : 1,
                                existing.id
                            ]
                        );
                        idMapping.products[product.id] = existing.id;
                        results.products.updated++;
                    } else {
                        // Criar novo produto
                        const result = await db.run(
                            `INSERT INTO products (
                                barcode, name, description, category_id, supplier_id,
                                store_id, brand, model, cost_price, sale_price,
                                stock, min_stock, is_active
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                product.barcode || null,
                                product.name,
                                product.description || null,
                                newCategoryId,
                                newSupplierId,
                                newStoreId,
                                product.brand || null,
                                product.model || null,
                                product.cost_price || 0,
                                product.sale_price || 0,
                                product.stock || 0,
                                product.min_stock || 0,
                                product.is_active !== undefined ? product.is_active : 1
                            ]
                        );
                        idMapping.products[product.id] = result.lastID;
                        results.products.created++;
                    }
                } catch (error) {
                    results.products.errors.push({ product: product.name, error: error.message });
                }
            }
        }

        // 5. Importar clientes
        if (requestedTypes.includes('customers') && importData.customers && Array.isArray(importData.customers)) {
            for (const customer of importData.customers) {
                try {
                    // Mapear store_id (usar targetStoreId se fornecido, senão usar do arquivo)
                    const newStoreId = targetStoreId || (customer.store_id ? idMapping.stores[customer.store_id] || customer.store_id : null);

                    // Verificar se cliente já existe pelo CPF/CNPJ ou nome
                    let existing = null;
                    if (customer.cpf_cnpj) {
                        existing = await db.get('SELECT id FROM customers WHERE cpf_cnpj = ?', [customer.cpf_cnpj]);
                    }
                    if (!existing) {
                        existing = await db.get('SELECT id FROM customers WHERE name = ? AND store_id = ?', [customer.name, newStoreId]);
                    }

                    if (existing) {
                        // Atualizar cliente existente
                        await db.run(
                            `UPDATE customers SET
                                name = ?, phone = ?, email = ?, address = ?,
                                city = ?, state = ?, zip_code = ?, credit_limit = ?
                             WHERE id = ?`,
                            [
                                customer.name,
                                customer.phone || null,
                                customer.email || null,
                                customer.address || null,
                                customer.city || null,
                                customer.state || null,
                                customer.zip_code || null,
                                customer.credit_limit || 0,
                                existing.id
                            ]
                        );
                        idMapping.customers[customer.id] = existing.id;
                        results.customers.updated++;
                    } else {
                        // Criar novo cliente
                        const result = await db.run(
                            `INSERT INTO customers (
                                name, cpf_cnpj, phone, email, address,
                                city, state, zip_code, credit_limit, store_id
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                customer.name,
                                customer.cpf_cnpj || null,
                                customer.phone || null,
                                customer.email || null,
                                customer.address || null,
                                customer.city || null,
                                customer.state || null,
                                customer.zip_code || null,
                                customer.credit_limit || 0,
                                newStoreId
                            ]
                        );
                        idMapping.customers[customer.id] = result.lastID;
                        results.customers.created++;
                    }
                } catch (error) {
                    results.customers.errors.push({ customer: customer.name, error: error.message });
                }
            }
        }

        // 6. Importar vendas (opcional - pode ser muito grande)
        if (requestedTypes.includes('sales') && importData.sales && Array.isArray(importData.sales)) {
            for (const sale of importData.sales) {
                try {
                    // Mapear store_id (usar targetStoreId se fornecido, senão usar do arquivo)
                    const newStoreId = targetStoreId || (sale.store_id ? idMapping.stores[sale.store_id] || sale.store_id : null);
                    const newCustomerId = sale.customer_id ? idMapping.customers[sale.customer_id] || sale.customer_id : null;

                    // Verificar se venda já existe pelo número
                    const existing = await db.get('SELECT id FROM sales WHERE sale_number = ?', [sale.sale_number]);

                    if (!existing) {
                        const result = await db.run(
                            `INSERT INTO sales (
                                sale_number, customer_id, seller_id, store_id,
                                total, discount, payment_method, fiscal_receipt,
                                status, observations, installments
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                sale.sale_number,
                                newCustomerId,
                                sale.seller_id || 1, // Default seller
                                newStoreId,
                                sale.total || 0,
                                sale.discount || 0,
                                sale.payment_method || 'dinheiro',
                                sale.fiscal_receipt || null,
                                sale.status || 'completed',
                                sale.observations || null,
                                sale.installments || null
                            ]
                        );

                        // Mapear ID antigo para novo
                        idMapping.sales[sale.id] = result.lastID;

                        // Importar itens da venda
                        if (importData.sale_items && Array.isArray(importData.sale_items)) {
                            const saleItems = importData.sale_items.filter(item => item.sale_id === sale.id);
                            for (const item of saleItems) {
                                const newProductId = idMapping.products[item.product_id] || item.product_id;
                                await db.run(
                                    `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total)
                                     VALUES (?, ?, ?, ?, ?)`,
                                    [result.lastID, newProductId, item.quantity, item.unit_price, item.total]
                                );
                            }
                        }

                        results.sales.created++;
                    } else {
                        idMapping.sales[sale.id] = existing.id;
                        results.sales.updated++;
                    }
                } catch (error) {
                    results.sales.errors.push({ sale: sale.sale_number, error: error.message });
                }
            }
        }

        // 7. Importar ordens de serviço
        if (requestedTypes.includes('service_orders') && importData.service_orders && Array.isArray(importData.service_orders)) {
            for (const order of importData.service_orders) {
                try {
                    // Mapear store_id (usar targetStoreId se fornecido, senão usar do arquivo)
                    const newStoreId = targetStoreId || (order.store_id ? idMapping.stores[order.store_id] || order.store_id : null);
                    const newCustomerId = idMapping.customers[order.customer_id] || order.customer_id;

                    // Verificar se OS já existe pelo número
                    const existing = await db.get('SELECT id FROM service_orders WHERE order_number = ?', [order.order_number]);

                    if (!existing) {
                        await db.run(
                            `INSERT INTO service_orders (
                                order_number, customer_id, technician_id, store_id,
                                device_type, brand, model, serial_number,
                                problem_description, diagnostic, estimated_value,
                                labor_cost, parts_cost, total_value, status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                order.order_number,
                                newCustomerId,
                                order.technician_id || null,
                                newStoreId,
                                order.device_type || null,
                                order.brand || null,
                                order.model || null,
                                order.serial_number || null,
                                order.problem_description || null,
                                order.diagnostic || null,
                                order.estimated_value || 0,
                                order.labor_cost || 0,
                                order.parts_cost || 0,
                                order.total_value || 0,
                                order.status || 'aguardando_autorizacao'
                            ]
                        );
                        results.service_orders.created++;
                    } else {
                        results.service_orders.updated++;
                    }
                } catch (error) {
                    results.service_orders.errors.push({ order: order.order_number, error: error.message });
                }
            }
        }

        // 8. Importar contas a receber
        if (requestedTypes.includes('accounts_receivable') && importData.accounts_receivable && Array.isArray(importData.accounts_receivable)) {
            for (const account of importData.accounts_receivable) {
                try {
                    const newCustomerId = idMapping.customers[account.customer_id] || account.customer_id;
                    const newSaleId = account.sale_id ? (idMapping.sales[account.sale_id] || account.sale_id) : null;

                    await db.run(
                        `INSERT INTO accounts_receivable (
                            sale_id, service_order_id, customer_id, description,
                            due_date, amount, paid_amount, status, payment_date, payment_method
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            newSaleId,
                            account.service_order_id || null,
                            newCustomerId,
                            account.description || null,
                            account.due_date,
                            account.amount || 0,
                            account.paid_amount || 0,
                            account.status || 'pending',
                            account.payment_date || null,
                            account.payment_method || null
                        ]
                    );
                    results.accounts_receivable.created++;
                } catch (error) {
                    results.accounts_receivable.errors.push({ account: account.description, error: error.message });
                }
            }
        }

        // 9. Importar contas a pagar
        if (requestedTypes.includes('accounts_payable') && importData.accounts_payable && Array.isArray(importData.accounts_payable)) {
            for (const account of importData.accounts_payable) {
                try {
                    const newSupplierId = account.supplier_id ? idMapping.suppliers[account.supplier_id] || account.supplier_id : null;

                    await db.run(
                        `INSERT INTO accounts_payable (
                            supplier_id, description, due_date, amount,
                            paid_amount, status, payment_date, payment_method
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            newSupplierId,
                            account.description,
                            account.due_date,
                            account.amount || 0,
                            account.paid_amount || 0,
                            account.status || 'pending',
                            account.payment_date || null,
                            account.payment_method || null
                        ]
                    );
                    results.accounts_payable.created++;
                } catch (error) {
                    results.accounts_payable.errors.push({ account: account.description, error: error.message });
                }
            }
        }

        // Limpar arquivo temporário
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.warn('Erro ao remover arquivo temporário:', error);
        }

        res.json({
            success: true,
            message: 'Importação concluída',
            results: results
        });

    } catch (error) {
        console.error('Erro ao importar dados:', error);
        
        // Limpar arquivo temporário em caso de erro
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.warn('Erro ao remover arquivo temporário:', unlinkError);
            }
        }

        res.status(500).json({ 
            error: 'Erro ao importar dados', 
            details: error.message 
        });
    }
});

module.exports = router;

