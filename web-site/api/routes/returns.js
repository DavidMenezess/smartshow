// ========================================
// ROTAS DE DEVOLUÇÕES
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const { getStoreFilter } = require('../middleware/store-filter');

const router = express.Router();

// Verificar se a tabela returns existe, se não, criar
async function ensureReturnsTableExists() {
    try {
        console.log('🔍 Verificando existência da tabela returns...');
        const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='returns'");
        
        if (!tableExists) {
            console.log('⚠️ Tabela returns não existe. Criando...');
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS returns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_number TEXT UNIQUE NOT NULL,
                    sale_id INTEGER NOT NULL,
                    sale_item_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    customer_id INTEGER,
                    store_id INTEGER NOT NULL,
                    defect_description TEXT NOT NULL,
                    action_type TEXT NOT NULL CHECK(action_type IN ('same_product', 'different_product', 'refund')),
                    original_price REAL NOT NULL,
                    original_payment_method TEXT NOT NULL,
                    replacement_product_id INTEGER,
                    replacement_price REAL,
                    price_difference REAL DEFAULT 0,
                    refund_amount REAL,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
                    processed_by INTEGER,
                    observations TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    FOREIGN KEY (sale_id) REFERENCES sales(id),
                    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (store_id) REFERENCES stores(id),
                    FOREIGN KEY (replacement_product_id) REFERENCES products(id),
                    FOREIGN KEY (processed_by) REFERENCES users(id)
                )
            `;
            
            await db.run(createTableSQL);
            console.log('✅ Tabela returns criada com sucesso!');
        } else {
            console.log('✅ Tabela returns já existe');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar/criar tabela returns:', error);
        console.error('❌ Mensagem:', error.message);
        console.error('❌ Stack:', error.stack);
        
        // Tentar criar a tabela mesmo assim (ignorar erro de verificação)
        try {
            console.log('🔄 Tentando criar tabela diretamente...');
            await db.run(`
                CREATE TABLE IF NOT EXISTS returns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_number TEXT UNIQUE NOT NULL,
                    sale_id INTEGER NOT NULL,
                    sale_item_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    customer_id INTEGER,
                    store_id INTEGER NOT NULL,
                    defect_description TEXT NOT NULL,
                    action_type TEXT NOT NULL CHECK(action_type IN ('same_product', 'different_product', 'refund')),
                    original_price REAL NOT NULL,
                    original_payment_method TEXT NOT NULL,
                    replacement_product_id INTEGER,
                    replacement_price REAL,
                    price_difference REAL DEFAULT 0,
                    refund_amount REAL,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
                    processed_by INTEGER,
                    observations TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    FOREIGN KEY (sale_id) REFERENCES sales(id),
                    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (store_id) REFERENCES stores(id),
                    FOREIGN KEY (replacement_product_id) REFERENCES products(id),
                    FOREIGN KEY (processed_by) REFERENCES users(id)
                )
            `);
            console.log('✅ Tabela returns criada com sucesso (tentativa direta)!');
        } catch (createError) {
            console.error('❌ Erro ao criar tabela returns (tentativa direta):', createError);
            console.error('❌ Mensagem:', createError.message);
            // Não lançar erro - deixar que a query SQL falhe e seja tratada
        }
    }
}

// Listar devoluções
router.get('/', auth, async (req, res) => {
    try {
        console.log('📥 Requisição GET /returns recebida');
        console.log('👤 Usuário:', req.user ? { id: req.user.id, role: req.user.role, store_id: req.user.store_id } : 'N/A');
        
        // Garantir que a tabela existe
        console.log('🔍 Verificando se tabela returns existe...');
        await ensureReturnsTableExists();
        console.log('✅ Tabela returns verificada/criada');
        
        const { startDate, endDate, status, store_id } = req.query;
        console.log('📋 Parâmetros da query:', { startDate, endDate, status, store_id });
        
        // Query simplificada primeiro para verificar se a tabela existe e tem dados
        let sql = `
            SELECT r.*,
                   s.sale_number,
                   s.payment_method as original_payment_method,
                   s.installments,
                   p.name as product_name,
                   p.barcode as product_barcode,
                   c.name as customer_name,
                   c.document as customer_document,
                   st.name as store_name,
                   u.name as processed_by_name,
                   rp.name as replacement_product_name,
                   r.replacement_price,
                   r.price_difference
            FROM returns r
            LEFT JOIN sales s ON r.sale_id = s.id
            LEFT JOIN products p ON r.product_id = p.id
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN stores st ON r.store_id = st.id
            LEFT JOIN users u ON r.processed_by = u.id
            LEFT JOIN products rp ON r.replacement_product_id = rp.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            sql += ` AND DATE(r.created_at) >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            sql += ` AND DATE(r.created_at) <= ?`;
            params.push(endDate);
        }

        if (status) {
            sql += ` AND r.status = ?`;
            params.push(status);
        }

        // Filtrar por loja
        const filter = getStoreFilter(req.user, store_id);
        console.log('🔍 Filtro de loja aplicado:', filter);
        console.log('👤 Usuário completo:', JSON.stringify(req.user, null, 2));
        
        // Verificar se há devoluções sem filtro primeiro (para debug)
        let allReturnsCount = null;
        try {
            allReturnsCount = await db.get("SELECT COUNT(*) as count FROM returns");
            console.log('📊 Total de devoluções SEM filtro:', allReturnsCount ? allReturnsCount.count : 0);
        } catch (countError) {
            console.error('⚠️ Erro ao contar devoluções:', countError);
        }
        
        // Filtrar por loja - CORREÇÃO CRÍTICA: Simplificar para garantir que encontre
        if (filter.store_id !== null && filter.store_id !== undefined) {
            // Tem store_id para filtrar (usuário comum ou admin/gerente com loja específica)
            const storeIdNum = parseInt(filter.store_id);
            if (!isNaN(storeIdNum) && storeIdNum > 0) {
                // CORREÇÃO: Usar apenas comparação direta primeiro, SQLite faz conversão automática
                // Se não funcionar, tentar com CAST como fallback
                sql += ` AND r.store_id = ?`;
                params.push(storeIdNum);
                console.log('📌 Filtrando por store_id:', storeIdNum, '(canSeeAll:', filter.canSeeAll, ')');
                console.log('📌 Usando comparação direta (SQLite faz conversão automática)');
            } else {
                console.warn('⚠️ Store_id inválido no filtro:', filter.store_id);
            }
        } else if (filter.canSeeAll) {
            // Admin/Gerente sem store_id - ver todas (não adicionar filtro)
            console.log('✅ Admin/Gerente - vendo todas as devoluções (sem filtro de loja)');
            console.log('✅ Usuário role:', req.user.role, 'store_id do usuário:', req.user.store_id);
            // Não adicionar filtro - query retornará todas as devoluções
            // CORREÇÃO CRÍTICA: Para admin sem store_id, usar fallback IMEDIATAMENTE
            // A query com JOINs pode falhar silenciosamente, então vamos usar fallback direto
            console.log('🔄 Admin sem store_id - usando fallback direto para garantir que funcione');
        } else {
            // Usuário sem store_id e não admin - não retornar nada
            console.warn('⚠️ Usuário sem store_id - não retornará devoluções');
            console.warn('⚠️ Usuário role:', req.user.role, 'store_id:', req.user.store_id);
            // Adicionar filtro que não retorna nada (store_id IS NULL ou store_id = -1)
            sql += ` AND 1=0`; // Sempre falso - não retorna nada
        }

        sql += ` ORDER BY r.created_at DESC`;

        // Executar query com tratamento de erro robusto
        let returns = [];
        try {
            console.log('🔍 Executando query SQL...');
            console.log('📝 SQL completo:', sql);
            console.log('📝 Parâmetros:', JSON.stringify(params));
            console.log('📝 Filtro aplicado:', filter);
            
            // Primeiro, verificar se há dados na tabela (query simples)
            try {
                const countResult = await db.get("SELECT COUNT(*) as count FROM returns");
                console.log('📊 Total de devoluções na tabela:', countResult ? countResult.count : 0);
                
                // Debug: ver todas as devoluções sem filtro para diagnóstico
                const allReturns = await db.all("SELECT id, return_number, store_id, status, created_at FROM returns ORDER BY created_at DESC LIMIT 10");
                console.log('🔍 Últimas 10 devoluções (sem filtro):', JSON.stringify(allReturns, null, 2));
            } catch (countError) {
                console.error('⚠️ Erro ao contar devoluções (pode ser tabela vazia):', countError.message);
            }
            
            // CORREÇÃO CRÍTICA: Tentar primeiro sem JOINs para verificar se o problema está nos JOINs
            if (filter.store_id !== null && filter.store_id !== undefined) {
                const storeIdNum = parseInt(filter.store_id);
                if (!isNaN(storeIdNum) && storeIdNum > 0) {
                    console.log('🔍 TESTE: Buscando devoluções SEM JOINs primeiro para diagnosticar...');
                    const simpleQuery = `SELECT * FROM returns WHERE store_id = ? ORDER BY created_at DESC`;
                    const simpleReturns = await db.all(simpleQuery, [storeIdNum]);
                    console.log('🔍 TESTE: Devoluções encontradas SEM JOINs:', simpleReturns.length);
                    if (simpleReturns.length > 0) {
                        console.log('✅ Devoluções existem no banco! O problema pode estar nos JOINs.');
                        console.log('🔍 Primeira devolução (sem JOIN):', JSON.stringify(simpleReturns[0], null, 2));
                    } else {
                        console.warn('⚠️ Nenhuma devolução encontrada mesmo sem JOINs. Verificando todas...');
                        const allReturnsCheck = await db.all(`SELECT * FROM returns ORDER BY created_at DESC LIMIT 5`);
                        console.log('🔍 Total de devoluções no banco (sem filtro):', allReturnsCheck.length);
                        if (allReturnsCheck.length > 0) {
                            console.log('⚠️ PROBLEMA: Existem devoluções mas não para store_id', storeIdNum);
                            allReturnsCheck.forEach((ret, idx) => {
                                console.log(`  Devolução ${idx + 1}: ID=${ret.id}, store_id=${ret.store_id} (tipo: ${typeof ret.store_id}), return_number=${ret.return_number}`);
                            });
                        }
                    }
                }
            } else if (filter.canSeeAll) {
                // Admin/Gerente - verificar se há devoluções no banco
                console.log('🔍 TESTE: Admin/Gerente - Verificando devoluções no banco...');
                const allReturnsCheck = await db.all(`SELECT id, return_number, store_id, status, created_at FROM returns ORDER BY created_at DESC LIMIT 10`);
                console.log('🔍 TESTE: Total de devoluções no banco (últimas 10):', allReturnsCheck.length);
                if (allReturnsCheck.length > 0) {
                    console.log('✅ Devoluções existem no banco para admin ver!');
                    allReturnsCheck.forEach((ret, idx) => {
                        console.log(`  Devolução ${idx + 1}: ID=${ret.id}, store_id=${ret.store_id} (tipo: ${typeof ret.store_id}), return_number=${ret.return_number}, status=${ret.status}`);
                    });
                } else {
                    console.log('ℹ️ Nenhuma devolução encontrada no banco.');
                }
            }
            
            // CORREÇÃO CRÍTICA: Se admin sem store_id, usar fallback IMEDIATAMENTE
            // A query com JOINs pode falhar silenciosamente, então vamos usar fallback direto
            let shouldUseFallback = false;
            let skipMainQuery = false;
            
            if (filter.canSeeAll && !filter.store_id) {
                console.log('🔍 Admin/Gerente SEM store_id detectado - Usando fallback DIRETO');
                console.log('🔄 Pulando query com JOINs e usando fallback imediatamente para garantir que funcione');
                skipMainQuery = true;
                shouldUseFallback = true;
            } else if (filter.canSeeAll && filter.store_id) {
                // Admin com store_id específico - tentar query normal primeiro
                console.log('🔍 Admin/Gerente COM store_id - Verificando devoluções no banco antes da query...');
                try {
                    const quickCheck = await db.get('SELECT COUNT(*) as count FROM returns');
                    const totalCount = quickCheck ? quickCheck.count : 0;
                    console.log('📊 Total de devoluções no banco:', totalCount);
                    
                    if (totalCount > 0) {
                        console.log('✅ Existem devoluções no banco. Executando query com JOINs...');
                        shouldUseFallback = true;
                    } else {
                        console.log('ℹ️ Nenhuma devolução encontrada no banco.');
                    }
                } catch (checkError) {
                    console.error('❌ Erro ao verificar devoluções:', checkError);
                }
            }
            
            // Se não deve pular a query principal, executá-la
            if (!skipMainQuery) {
                returns = await db.all(sql, params);
            } else {
                // Se deve pular, definir returns como vazio para entrar no fallback
                returns = [];
                console.log('⏭️ Query principal pulada - usando fallback direto');
            }
            
            // Se admin, há devoluções no banco, mas query retornou vazio, usar fallback IMEDIATAMENTE
            if (shouldUseFallback && returns.length === 0) {
                console.log('⚠️ CRÍTICO: Admin tem devoluções no banco mas query retornou vazio!');
                console.log('🔄 Pulando para fallback IMEDIATAMENTE...');
                // Não continuar com o código abaixo, ir direto para o fallback
            }
            
            if (!skipMainQuery) {
                console.log('📦 Resultado bruto da query:', typeof returns, Array.isArray(returns) ? returns.length : 'não é array');
                console.log('📦 SQL executado:', sql);
                console.log('📦 Parâmetros usados:', JSON.stringify(params));
                
                if (!returns) {
                    console.log('⚠️ Query retornou null/undefined, usando array vazio');
                    returns = [];
                } else if (!Array.isArray(returns)) {
                    console.log('⚠️ Query não retornou array, convertendo...');
                    console.log('⚠️ Tipo recebido:', typeof returns);
                    returns = [];
                }
                
                console.log('✅ Query executada com sucesso. Devoluções encontradas:', returns.length);
            }
            
            // CORREÇÃO CRÍTICA: Se admin sem store_id OU admin com store_id mas query retornou vazio, usar fallback IMEDIATAMENTE
            if (skipMainQuery || (returns.length === 0 && filter.canSeeAll) || (shouldUseFallback && returns.length === 0)) {
                if (skipMainQuery) {
                    console.log('🔄 Admin sem store_id - Executando fallback DIRETO (pulando query principal)...');
                } else {
                    console.log('⚠️ CRÍTICO: Admin não encontrou devoluções na query principal!');
                    console.log('🔄 Executando fallback IMEDIATAMENTE...');
                }
                try {
                    // Verificar se há devoluções no banco
                    const allReturnsDebug = await db.all('SELECT id, return_number, store_id, status, created_at FROM returns ORDER BY created_at DESC LIMIT 10');
                    console.log('🔍 DEBUG: Total de devoluções no banco (últimas 10):', allReturnsDebug.length);
                    if (allReturnsDebug.length > 0) {
                        if (skipMainQuery) {
                            console.log('✅ Admin sem store_id - Buscando todas as devoluções sem JOINs e adicionando dados manualmente...');
                        } else {
                            console.log('⚠️ PROBLEMA: Existem devoluções no banco mas a query com JOINs não retornou!');
                            console.log('🔄 Usando fallback: Buscar todas as devoluções sem JOINs e adicionar dados manualmente...');
                        }
                        allReturnsDebug.forEach((ret, idx) => {
                            console.log(`  Devolução ${idx + 1}: ID=${ret.id}, store_id=${ret.store_id} (tipo: ${typeof ret.store_id}), return_number=${ret.return_number}, status=${ret.status}`);
                        });
                        
                        // CORREÇÃO: Buscar TODAS as devoluções sem JOINs e adicionar dados manualmente
                        const allReturnsSimple = await db.all('SELECT * FROM returns ORDER BY created_at DESC');
                        if (allReturnsSimple.length > 0) {
                            console.log('✅ Encontradas', allReturnsSimple.length, 'devoluções sem JOINs. Adicionando dados básicos...');
                            // Adicionar dados básicos manualmente para TODAS as devoluções
                            for (const ret of allReturnsSimple) {
                                try {
                                    const sale = ret.sale_id ? await db.get('SELECT sale_number, payment_method, installments FROM sales WHERE id = ?', [ret.sale_id]) : null;
                                    const product = ret.product_id ? await db.get('SELECT name, barcode FROM products WHERE id = ?', [ret.product_id]) : null;
                                    const customer = ret.customer_id ? await db.get('SELECT name, document FROM customers WHERE id = ?', [ret.customer_id]) : null;
                                    const store = ret.store_id ? await db.get('SELECT name FROM stores WHERE id = ?', [ret.store_id]) : null;
                                    const processedBy = ret.processed_by ? await db.get('SELECT name FROM users WHERE id = ?', [ret.processed_by]) : null;
                                    const replacementProduct = ret.replacement_product_id ? await db.get('SELECT name FROM products WHERE id = ?', [ret.replacement_product_id]) : null;
                                    
                                    ret.sale_number = sale?.sale_number || null;
                                    ret.original_payment_method = sale?.payment_method || ret.original_payment_method || null;
                                    ret.installments = sale?.installments || null;
                                    ret.product_name = product?.name || null;
                                    ret.product_barcode = product?.barcode || null;
                                    ret.customer_name = customer?.name || null;
                                    ret.customer_document = customer?.document || null;
                                    ret.store_name = store?.name || null;
                                    ret.processed_by_name = processedBy?.name || null;
                                    ret.replacement_product_name = replacementProduct?.name || null;
                                    ret.replacement_price = ret.replacement_price || null;
                                    ret.price_difference = ret.price_difference || 0;
                                    
                                    console.log(`✅ Dados adicionados para devolução ${ret.id}: sale_number=${ret.sale_number}, customer_name=${ret.customer_name}, product_name=${ret.product_name}, replacement_product_name=${ret.replacement_product_name}, processed_by_name=${ret.processed_by_name}, installments=${ret.installments}`);
                                } catch (joinError) {
                                    console.error('❌ Erro ao buscar dados adicionais para devolução', ret.id, ':', joinError.message);
                                    console.error('❌ Stack:', joinError.stack);
                                }
                            }
                            returns = allReturnsSimple;
                            console.log('✅ Retornando', returns.length, 'devoluções com dados básicos adicionados (fallback admin)');
                            console.log('✅ Primeira devolução (fallback):', returns.length > 0 ? {
                                id: returns[0].id,
                                return_number: returns[0].return_number,
                                product_name: returns[0].product_name,
                                customer_name: returns[0].customer_name,
                                sale_number: returns[0].sale_number,
                                store_id: returns[0].store_id
                            } : 'Nenhuma');
                        } else {
                            console.log('ℹ️ Nenhuma devolução encontrada no banco.');
                            returns = []; // Garantir que seja array vazio
                        }
                    } else {
                        console.log('ℹ️ Nenhuma devolução encontrada no banco.');
                        returns = []; // Garantir que seja array vazio
                    }
                } catch (debugError) {
                    console.error('❌ Erro ao fazer debug:', debugError);
                    console.error('❌ Stack:', debugError.stack);
                    returns = []; // Garantir que seja array vazio mesmo em caso de erro
                }
            }
            
            // GARANTIR que returns seja sempre um array válido
            if (!Array.isArray(returns)) {
                console.warn('⚠️ Returns não é array, convertendo para array vazio');
                returns = [];
            }
            
            // CORREÇÃO CRÍTICA: Se query retornou dados mas estão incompletos, usar fallback também
            // Verificar se há dados faltando mesmo quando a query retornou resultados
            let hasIncompleteData = false;
            if (returns.length > 0) {
                const firstReturn = returns[0];
                if (!firstReturn.customer_name || !firstReturn.sale_number || !firstReturn.product_name || !firstReturn.processed_by_name) {
                    hasIncompleteData = true;
                    console.warn('⚠️ Query retornou dados mas estão incompletos. Usando fallback para preencher...');
                }
            }
            
            // Se não encontrou com JOINs OU dados estão incompletos, buscar sem JOINs e preencher
            if ((returns.length === 0 || hasIncompleteData) && filter.store_id !== null && filter.store_id !== undefined) {
                const storeIdNum = parseInt(filter.store_id);
                if (!isNaN(storeIdNum) && storeIdNum > 0) {
                    if (returns.length === 0) {
                        console.warn('⚠️ Query com JOINs retornou 0, mas devoluções existem. Buscando sem JOINs...');
                    } else {
                        console.warn('⚠️ Query retornou dados incompletos. Buscando dados faltando sem JOINs...');
                    }
                    const fallbackSimple = await db.all(`SELECT * FROM returns WHERE store_id = ? ORDER BY created_at DESC`, [storeIdNum]);
                    if (fallbackSimple.length > 0) {
                        console.log('✅ Encontradas', fallbackSimple.length, 'devoluções sem JOINs. Adicionando dados básicos...');
                        // Adicionar dados básicos manualmente
                        for (const ret of fallbackSimple) {
                            try {
                                const sale = await db.get('SELECT sale_number, payment_method, installments FROM sales WHERE id = ?', [ret.sale_id]);
                                const product = await db.get('SELECT name, barcode FROM products WHERE id = ?', [ret.product_id]);
                                const customer = ret.customer_id ? await db.get('SELECT name, document FROM customers WHERE id = ?', [ret.customer_id]) : null;
                                const store = await db.get('SELECT name FROM stores WHERE id = ?', [ret.store_id]);
                                const processedBy = ret.processed_by ? await db.get('SELECT name FROM users WHERE id = ?', [ret.processed_by]) : null;
                                const replacementProduct = ret.replacement_product_id ? await db.get('SELECT name FROM products WHERE id = ?', [ret.replacement_product_id]) : null;
                                
                                ret.sale_number = sale?.sale_number || null;
                                ret.original_payment_method = sale?.payment_method || ret.original_payment_method || null;
                                ret.installments = sale?.installments || null;
                                ret.product_name = product?.name || null;
                                ret.product_barcode = product?.barcode || null;
                                ret.customer_name = customer?.name || null;
                                ret.customer_document = customer?.document || null;
                                ret.store_name = store?.name || null;
                                ret.processed_by_name = processedBy?.name || null;
                                ret.replacement_product_name = replacementProduct?.name || null;
                                // Garantir que replacement_price e price_difference sejam incluídos
                                ret.replacement_price = ret.replacement_price || null;
                                ret.price_difference = ret.price_difference || 0;
                                
                                console.log(`✅ Dados completos para devolução ${ret.id}: customer=${ret.customer_name}, sale=${ret.sale_number}, product=${ret.product_name}, user=${ret.processed_by_name}, installments=${ret.installments}`);
                            } catch (joinError) {
                                console.warn('⚠️ Erro ao buscar dados adicionais para devolução', ret.id, ':', joinError.message);
                            }
                        }
                        returns = fallbackSimple;
                        console.log('✅ Retornando', returns.length, 'devoluções com dados básicos adicionados');
                    }
                }
            }
        } catch (queryError) {
            console.error('❌ Erro na query SQL:', queryError);
            console.error('❌ Mensagem:', queryError.message);
            console.error('❌ Stack:', queryError.stack);
            console.error('❌ SQL:', sql);
            console.error('❌ Parâmetros:', params);
            
            // Se for erro de tabela não encontrada, tentar criar novamente
            if (queryError.message && (
                queryError.message.includes('no such table: returns') ||
                queryError.message.includes('no such table') && queryError.message.includes('returns')
            )) {
                console.log('🔄 Erro de tabela não encontrada. Tentando criar novamente...');
                try {
                    await ensureReturnsTableExists();
                    console.log('✅ Tabela criada. Tentando query novamente...');
                    // Tentar novamente
                    returns = await db.all(sql, params) || [];
                    console.log('✅ Query retry bem-sucedida. Devoluções:', returns.length);
                } catch (retryError) {
                    console.error('❌ Erro ao tentar novamente:', retryError);
                    console.error('❌ Mensagem do retry:', retryError.message);
                    // Retornar array vazio em vez de lançar erro
                    returns = [];
                }
            } else {
                // Para outros erros, também retornar array vazio para não quebrar a interface
                console.error('❌ Erro desconhecido na query. Retornando array vazio.');
                returns = [];
            }
        }
        
        // Garantir que todos os campos obrigatórios tenham valores padrão
        // CORREÇÃO: Se ainda faltam dados, buscar de forma síncrona antes de mapear
        if (returns.length > 0) {
            console.log('🔍 Verificando se há dados faltando antes do mapeamento final...');
            for (const ret of returns) {
                // Se product_name está faltando, buscar
                if (!ret.product_name && ret.product_id) {
                    try {
                        const product = await db.get('SELECT name, barcode FROM products WHERE id = ?', [ret.product_id]);
                        if (product) {
                            ret.product_name = product.name || product.barcode || null;
                            ret.product_barcode = product.barcode || ret.product_barcode || null;
                            console.log(`✅ Product_name adicionado para devolução ${ret.id}: ${ret.product_name}`);
                        }
                    } catch (err) {
                        console.warn('⚠️ Erro ao buscar produto', ret.product_id, ':', err.message);
                    }
                }
                
                // Se customer_name está faltando, buscar
                if (!ret.customer_name && ret.customer_id) {
                    try {
                        const customer = await db.get('SELECT name FROM customers WHERE id = ?', [ret.customer_id]);
                        if (customer) {
                            ret.customer_name = customer.name || null;
                            console.log(`✅ Customer_name adicionado para devolução ${ret.id}: ${ret.customer_name}`);
                        }
                    } catch (err) {
                        console.warn('⚠️ Erro ao buscar cliente', ret.customer_id, ':', err.message);
                    }
                }
                
                // Se sale_number ou installments está faltando, buscar
                if ((!ret.sale_number || !ret.installments) && ret.sale_id) {
                    try {
                        const sale = await db.get('SELECT sale_number, payment_method, installments FROM sales WHERE id = ?', [ret.sale_id]);
                        if (sale) {
                            if (!ret.sale_number) {
                                ret.sale_number = sale.sale_number || null;
                                console.log(`✅ Sale_number adicionado para devolução ${ret.id}: ${ret.sale_number}`);
                            }
                            if (!ret.installments) {
                                ret.installments = sale.installments || null;
                                console.log(`✅ Installments adicionado para devolução ${ret.id}: ${ret.installments}`);
                            }
                            if (!ret.original_payment_method) {
                                ret.original_payment_method = sale.payment_method || ret.original_payment_method || null;
                            }
                        }
                    } catch (err) {
                        console.warn('⚠️ Erro ao buscar venda', ret.sale_id, ':', err.message);
                    }
                }
                
                // Se processed_by_name está faltando, buscar
                if (!ret.processed_by_name && ret.processed_by) {
                    try {
                        const processedBy = await db.get('SELECT name FROM users WHERE id = ?', [ret.processed_by]);
                        if (processedBy) {
                            ret.processed_by_name = processedBy.name || null;
                            console.log(`✅ Processed_by_name adicionado para devolução ${ret.id}: ${ret.processed_by_name}`);
                        }
                    } catch (err) {
                        console.warn('⚠️ Erro ao buscar usuário processador', ret.processed_by, ':', err.message);
                    }
                }
                
                // Se replacement_product_name está faltando, buscar
                if (!ret.replacement_product_name && ret.replacement_product_id) {
                    try {
                        const replacementProduct = await db.get('SELECT name FROM products WHERE id = ?', [ret.replacement_product_id]);
                        if (replacementProduct) {
                            ret.replacement_product_name = replacementProduct.name || null;
                            console.log(`✅ Replacement_product_name adicionado para devolução ${ret.id}: ${ret.replacement_product_name}`);
                        }
                    } catch (err) {
                        console.warn('⚠️ Erro ao buscar produto de substituição', ret.replacement_product_id, ':', err.message);
                    }
                }
            }
        }
        
        returns = returns.map(ret => {
            return {
                ...ret,
                product_name: ret.product_name || ret.product_barcode || 'Produto não encontrado',
                customer_name: ret.customer_name || null,
                sale_number: ret.sale_number || null,
                original_payment_method: ret.original_payment_method || 'Não informado',
                installments: ret.installments || null,
                replacement_product_name: ret.replacement_product_name || null,
                replacement_price: ret.replacement_price || null,
                price_difference: ret.price_difference || 0,
                processed_by_name: ret.processed_by_name || null
            };
        });
        
        console.log('📤 Enviando resposta com', returns.length, 'devoluções');
        console.log('📤 Primeira devolução (se houver):', returns.length > 0 ? {
            id: returns[0].id,
            return_number: returns[0].return_number,
            product_name: returns[0].product_name,
            customer_name: returns[0].customer_name,
            sale_number: returns[0].sale_number
        } : 'Nenhuma');
        
        // Se não encontrou devoluções, verificar se há problema no filtro
        if (returns.length === 0) {
            // Verificar novamente quantas devoluções existem
            try {
                const finalCount = await db.get("SELECT COUNT(*) as count FROM returns");
                if (finalCount && finalCount.count > 0) {
                    console.warn('⚠️ ATENÇÃO: Query com filtro retornou 0, mas existem', finalCount.count, 'devoluções no banco!');
                    console.warn('⚠️ Isso indica problema no filtro de store_id');
                    
                    // Debug: ver todas as devoluções e seus store_ids
                    const allReturnsDebug = await db.all("SELECT id, return_number, store_id, typeof(store_id) as store_id_type, created_at FROM returns ORDER BY created_at DESC LIMIT 10");
                    console.warn('🔍 Últimas 10 devoluções no banco:', JSON.stringify(allReturnsDebug, null, 2));
                    console.warn('🔍 Store_id do usuário:', req.user.store_id, 'Tipo:', typeof req.user.store_id);
                    console.warn('🔍 Store_id do filtro:', filter.store_id, 'Tipo:', typeof filter.store_id);
                    
                    // CORREÇÃO: Tentar buscar novamente com diferentes estratégias
                    let fallbackReturns = [];
                    
                    // Estratégia 1: Se o usuário tem store_id, buscar diretamente (comparação simples)
                    if (req.user.store_id) {
                        const userStoreIdNum = parseInt(req.user.store_id);
                        if (!isNaN(userStoreIdNum) && userStoreIdNum > 0) {
                            console.warn('🔄 Tentativa 1: Buscando com store_id do usuário (comparação direta):', userStoreIdNum);
                            // Tentar primeiro sem JOINs para verificar se o problema está nos JOINs
                            const simpleReturns = await db.all(`
                                SELECT * FROM returns 
                                WHERE store_id = ?
                                ORDER BY created_at DESC
                            `, [userStoreIdNum]);
                            console.log('✅ Devoluções encontradas sem JOINs:', simpleReturns.length);
                            
                            if (simpleReturns.length > 0) {
                                console.log('⚠️ PROBLEMA: Devoluções existem mas JOINs podem estar falhando');
                                console.log('⚠️ Primeira devolução (sem JOIN):', JSON.stringify(simpleReturns[0], null, 2));
                                
                                // Se encontrou sem JOINs, adicionar dados básicos manualmente
                                console.log('🔄 Adicionando dados básicos manualmente...');
                                for (const ret of simpleReturns) {
                                    try {
                                        const sale = await db.get('SELECT sale_number, payment_method, installments FROM sales WHERE id = ?', [ret.sale_id]);
                                        const product = await db.get('SELECT name, barcode FROM products WHERE id = ?', [ret.product_id]);
                                        const customer = ret.customer_id ? await db.get('SELECT name, document FROM customers WHERE id = ?', [ret.customer_id]) : null;
                                        const store = await db.get('SELECT name FROM stores WHERE id = ?', [ret.store_id]);
                                        const processedBy = ret.processed_by ? await db.get('SELECT name FROM users WHERE id = ?', [ret.processed_by]) : null;
                                        const replacementProduct = ret.replacement_product_id ? await db.get('SELECT name FROM products WHERE id = ?', [ret.replacement_product_id]) : null;
                                        
                                        ret.sale_number = sale?.sale_number || null;
                                        ret.original_payment_method = sale?.payment_method || ret.original_payment_method;
                                        ret.installments = sale?.installments || null;
                                        ret.product_name = product?.name || null;
                                        ret.product_barcode = product?.barcode || null;
                                        ret.customer_name = customer?.name || null;
                                        ret.customer_document = customer?.document || null;
                                        ret.store_name = store?.name || null;
                                        ret.processed_by_name = processedBy?.name || null;
                                        ret.replacement_product_name = replacementProduct?.name || null;
                                        // Garantir que replacement_price e price_difference sejam incluídos
                                        ret.replacement_price = ret.replacement_price || null;
                                        ret.price_difference = ret.price_difference || 0;
                                    } catch (joinError) {
                                        console.warn('⚠️ Erro ao buscar dados adicionais para devolução', ret.id, ':', joinError.message);
                                    }
                                }
                                console.log('✅ Retornando', simpleReturns.length, 'devoluções com dados básicos adicionados');
                                return res.json(simpleReturns);
                            }
                            
                            // Se não encontrou nem sem JOINs, tentar com JOINs
                            fallbackReturns = await db.all(`
                                SELECT r.*,
                                       s.sale_number,
                                       s.payment_method as original_payment_method,
                                       s.installments,
                                       p.name as product_name,
                                       p.barcode as product_barcode,
                                       c.name as customer_name,
                                       c.document as customer_document,
                                       st.name as store_name,
                                       u.name as processed_by_name,
                                       rp.name as replacement_product_name,
                                       r.replacement_price,
                                       r.price_difference
                                FROM returns r
                                LEFT JOIN sales s ON r.sale_id = s.id
                                LEFT JOIN products p ON r.product_id = p.id
                                LEFT JOIN customers c ON r.customer_id = c.id
                                LEFT JOIN stores st ON r.store_id = st.id
                                LEFT JOIN users u ON r.processed_by = u.id
                                LEFT JOIN products rp ON r.replacement_product_id = rp.id
                                WHERE r.store_id = ?
                                ORDER BY r.created_at DESC
                            `, [userStoreIdNum]);
                            console.log('✅ Devoluções encontradas (fallback 1 com JOINs):', fallbackReturns.length);
                            
                            if (fallbackReturns.length > 0) {
                                console.log('✅ Retornando devoluções encontradas pelo fallback 1');
                                return res.json(fallbackReturns);
                            }
                        }
                    }
                    
                    // Estratégia 2: Buscar todas as devoluções e filtrar no código (último recurso)
                    if (fallbackReturns.length === 0 && (req.user.role === 'admin' || req.user.role === 'gerente' || filter.canSeeAll)) {
                        console.warn('🔄 Tentativa 2: Admin/Gerente - retornando todas as devoluções');
                        fallbackReturns = await db.all(`
                            SELECT r.*,
                                   s.sale_number,
                                   s.payment_method as original_payment_method,
                                   s.installments,
                                   p.name as product_name,
                                   p.barcode as product_barcode,
                                   c.name as customer_name,
                                   c.document as customer_document,
                                   st.name as store_name,
                                   u.name as processed_by_name,
                                   rp.name as replacement_product_name,
                                   r.replacement_price,
                                   r.price_difference
                            FROM returns r
                            LEFT JOIN sales s ON r.sale_id = s.id
                            LEFT JOIN products p ON r.product_id = p.id
                            LEFT JOIN customers c ON r.customer_id = c.id
                            LEFT JOIN stores st ON r.store_id = st.id
                            LEFT JOIN users u ON r.processed_by = u.id
                            LEFT JOIN products rp ON r.replacement_product_id = rp.id
                            ORDER BY r.created_at DESC
                        `);
                        console.log('✅ Devoluções encontradas (fallback 2):', fallbackReturns.length);
                        
                        if (fallbackReturns.length > 0) {
                            return res.json(fallbackReturns);
                        }
                    }
                }
            } catch (debugError) {
                console.error('❌ Erro ao fazer query de debug:', debugError);
            }
        }
        
        res.json(returns);
    } catch (error) {
        console.error('❌ Erro ao listar devoluções:', error);
        console.error('❌ Stack:', error.stack);
        console.error('❌ Mensagem:', error.message);
        
        // Se o erro for porque a tabela não existe, tentar criar e retornar array vazio
        if (error.message && (
            error.message.includes('no such table: returns') ||
            (error.message.includes('no such table') && error.message.includes('returns'))
        )) {
            console.log('⚠️ Tabela returns não existe. Tentando criar...');
            try {
                await ensureReturnsTableExists();
                // Retornar array vazio após criar tabela
                return res.json([]);
            } catch (createError) {
                console.error('❌ Erro ao criar tabela no catch:', createError);
                // Mesmo assim, retornar array vazio para não quebrar a interface
                return res.json([]);
            }
        }
        
        // Para outros erros, retornar mensagem de erro
        const errorMessage = error.message || 'Erro desconhecido ao listar devoluções';
        console.error('❌ Enviando erro para cliente:', errorMessage);
        
        res.status(500).json({ 
            error: 'Erro ao listar devoluções',
            details: errorMessage,
            type: error.name || 'UnknownError'
        });
    }
});

// Obter devolução por ID
router.get('/:id', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const { id } = req.params;
        console.log('📥 Buscando devolução por ID:', id);
        
        // Tentar primeiro com JOINs
        let returnData = null;
        try {
            returnData = await db.get(
                `SELECT r.*,
                        s.sale_number,
                        s.payment_method as original_payment_method,
                        s.installments,
                        s.total as sale_total,
                        p.name as product_name,
                        p.barcode as product_barcode,
                        p.sale_price as current_product_price,
                        c.name as customer_name,
                        c.document as customer_document,
                        st.name as store_name,
                        u.name as processed_by_name,
                        rp.name as replacement_product_name,
                        rp.sale_price as replacement_product_price
                 FROM returns r
                 LEFT JOIN sales s ON r.sale_id = s.id
                 LEFT JOIN products p ON r.product_id = p.id
                 LEFT JOIN customers c ON r.customer_id = c.id
                 LEFT JOIN stores st ON r.store_id = st.id
                 LEFT JOIN users u ON r.processed_by = u.id
                 LEFT JOIN products rp ON r.replacement_product_id = rp.id
                 WHERE r.id = ?`,
                [id]
            );
            
            // Garantir que replacement_price e price_difference sejam incluídos
            if (returnData) {
                returnData.replacement_price = returnData.replacement_price || null;
                returnData.price_difference = returnData.price_difference || 0;
            }
        } catch (joinError) {
            console.warn('⚠️ Erro na query com JOINs, usando fallback:', joinError.message);
            returnData = null;
        }

        // Se não encontrou ou dados estão incompletos, buscar sem JOINs e adicionar manualmente
        if (!returnData || !returnData.product_name) {
            console.log('⚠️ Devolução não encontrada ou dados incompletos com JOINs. Buscando sem JOINs...');
            const simpleReturn = await db.get('SELECT * FROM returns WHERE id = ?', [id]);
            
            if (!simpleReturn) {
                return res.status(404).json({ error: 'Devolução não encontrada' });
            }
            
            // Adicionar dados básicos manualmente
            try {
                const sale = await db.get('SELECT sale_number, payment_method, installments, total FROM sales WHERE id = ?', [simpleReturn.sale_id]);
                const product = await db.get('SELECT name, barcode, sale_price FROM products WHERE id = ?', [simpleReturn.product_id]);
                const customer = simpleReturn.customer_id ? await db.get('SELECT name, document FROM customers WHERE id = ?', [simpleReturn.customer_id]) : null;
                const store = await db.get('SELECT name FROM stores WHERE id = ?', [simpleReturn.store_id]);
                const processedBy = simpleReturn.processed_by ? await db.get('SELECT name FROM users WHERE id = ?', [simpleReturn.processed_by]) : null;
                const replacementProduct = simpleReturn.replacement_product_id ? await db.get('SELECT name, sale_price FROM products WHERE id = ?', [simpleReturn.replacement_product_id]) : null;
                
                returnData = {
                    ...simpleReturn,
                    sale_number: sale?.sale_number || null,
                    original_payment_method: sale?.payment_method || simpleReturn.original_payment_method,
                    installments: sale?.installments || null,
                    sale_total: sale?.total || null,
                    product_name: product?.name || null,
                    product_barcode: product?.barcode || null,
                    current_product_price: product?.sale_price || null,
                    customer_name: customer?.name || null,
                    customer_document: customer?.document || null,
                    store_name: store?.name || null,
                    processed_by_name: processedBy?.name || null,
                    replacement_product_name: replacementProduct?.name || null,
                    replacement_product_price: replacementProduct?.sale_price || null,
                    replacement_price: simpleReturn.replacement_price || null,
                    price_difference: simpleReturn.price_difference || 0
                };
                
                console.log('✅ Dados adicionados manualmente para devolução', id);
            } catch (joinError) {
                console.error('❌ Erro ao buscar dados adicionais:', joinError);
                // Retornar mesmo sem dados adicionais
                returnData = simpleReturn;
            }
        }

        // Garantir valores padrão
        returnData = {
            ...returnData,
            product_name: returnData.product_name || returnData.product_barcode || 'Produto não encontrado',
            customer_name: returnData.customer_name || null,
            sale_number: returnData.sale_number || null,
            original_payment_method: returnData.original_payment_method || 'Não informado',
            replacement_product_name: returnData.replacement_product_name || null,
            replacement_price: returnData.replacement_price || null,
            price_difference: returnData.price_difference || 0,
            processed_by_name: returnData.processed_by_name || null
        };

        // Se ainda não tem processed_by_name, buscar
        if (!returnData.processed_by_name && returnData.processed_by) {
            try {
                const user = await db.get('SELECT name FROM users WHERE id = ?', [returnData.processed_by]);
                if (user) {
                    returnData.processed_by_name = user.name;
                }
            } catch (userError) {
                console.warn('⚠️ Erro ao buscar nome do usuário:', userError.message);
            }
        }

        console.log('✅ Devolução encontrada:', returnData.return_number);
        console.log('✅ Processed by:', returnData.processed_by_name);
        res.json(returnData);
    } catch (error) {
        console.error('❌ Erro ao obter devolução:', error);
        console.error('❌ Stack:', error.stack);
        console.error('❌ ID da devolução:', req.params.id);
        
        // Tentar retornar pelo menos dados básicos
        try {
            const basicReturn = await db.get('SELECT * FROM returns WHERE id = ?', [req.params.id]);
            if (basicReturn) {
                console.log('⚠️ Retornando dados básicos devido a erro nos JOINs');
                return res.json({
                    ...basicReturn,
                    product_name: 'Produto não encontrado',
                    customer_name: null,
                    sale_number: null,
                    processed_by_name: null
                });
            }
        } catch (basicError) {
            console.error('❌ Erro ao buscar dados básicos:', basicError);
        }
        
        res.status(500).json({ error: 'Erro ao obter devolução', details: error.message });
    }
});

// Criar devolução
router.post('/', auth, async (req, res) => {
    try {
        console.log('📝 Iniciando criação de devolução...');
        console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));
        
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const {
            sale_id,
            sale_item_id,
            product_id,
            defect_description,
            action_type,
            replacement_product_id,
            observations
        } = req.body;

        console.log('✅ Dados validados:', { sale_id, sale_item_id, product_id, defect_description, action_type, replacement_product_id });

        if (!sale_id || !sale_item_id || !product_id || !defect_description || !action_type) {
            return res.status(400).json({ error: 'Dados obrigatórios: sale_id, sale_item_id, product_id, defect_description, action_type' });
        }

        // Buscar informações da venda e do item
        console.log('🔍 Buscando informações da venda...');
        const sale = await db.get(
            `SELECT s.*, c.id as customer_id, s.store_id
             FROM sales s
             LEFT JOIN customers c ON s.customer_id = c.id
             WHERE s.id = ?`,
            [sale_id]
        );

        if (!sale) {
            console.error('❌ Venda não encontrada:', sale_id);
            return res.status(404).json({ error: 'Venda não encontrada' });
        }
        console.log('✅ Venda encontrada:', sale.sale_number);

        console.log('🔍 Buscando item da venda...');
        const saleItem = await db.get(
            `SELECT si.*, p.sale_price as current_price
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.id = ? AND si.sale_id = ?`,
            [sale_item_id, sale_id]
        );

        if (!saleItem) {
            console.error('❌ Item da venda não encontrado:', { sale_item_id, sale_id });
            return res.status(404).json({ error: 'Item da venda não encontrado' });
        }
        console.log('✅ Item da venda encontrado:', saleItem);

        // Validar ação
        console.log('🔍 Validando ação:', action_type);
        let replacementProductId = null;
        let replacementPrice = null;
        let priceDifference = 0;
        let refundAmount = null;

        if (action_type === 'different_product') {
            if (!replacement_product_id) {
                console.error('❌ replacement_product_id não fornecido');
                return res.status(400).json({ error: 'replacement_product_id é obrigatório para troca por outro produto' });
            }

            console.log('🔍 Buscando produto de substituição:', replacement_product_id);
            const replacementProduct = await db.get('SELECT * FROM products WHERE id = ?', [replacement_product_id]);
            if (!replacementProduct) {
                console.error('❌ Produto de substituição não encontrado:', replacement_product_id);
                return res.status(404).json({ error: 'Produto de substituição não encontrado' });
            }

            replacementProductId = replacement_product_id;
            replacementPrice = replacementProduct.sale_price || replacementProduct.cost_price || 0;
            priceDifference = replacementPrice - saleItem.unit_price;
            console.log('✅ Produto de substituição encontrado:', { 
                name: replacementProduct.name, 
                price: replacementPrice, 
                priceDifference 
            });
        } else if (action_type === 'refund') {
            refundAmount = saleItem.unit_price;
            console.log('✅ Reembolso calculado:', refundAmount);
        }

        // Gerar número da devolução
        const returnNumber = `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Obter store_id - garantir que sempre tenha um valor válido
        const userStoreId = req.user.store_id;
        let storeId = sale.store_id || userStoreId;
        
        console.log('🏪 Store IDs disponíveis:', {
            sale_store_id: sale.store_id,
            user_store_id: userStoreId,
            storeId_atual: storeId
        });
        
        if (!storeId) {
            console.warn('⚠️ Nenhum store_id encontrado. Buscando loja padrão...');
            const defaultStore = await db.get('SELECT id FROM stores WHERE is_active = 1 ORDER BY id LIMIT 1');
            storeId = defaultStore ? defaultStore.id : 1;
            console.log('✅ Store_id definido como:', storeId);
        }
        
        // Garantir que storeId seja um número válido
        storeId = parseInt(storeId) || 1;
        console.log('✅ Store_id final para devolução:', storeId, '(tipo:', typeof storeId, ')');
        
        // Verificar se a loja existe
        try {
            const storeExists = await db.get('SELECT id, name FROM stores WHERE id = ?', [storeId]);
            if (!storeExists) {
                console.warn('⚠️ Loja não encontrada, usando loja padrão');
                const defaultStore = await db.get('SELECT id FROM stores WHERE is_active = 1 ORDER BY id LIMIT 1');
                storeId = defaultStore ? defaultStore.id : 1;
                console.log('✅ Store_id ajustado para:', storeId);
            } else {
                console.log('✅ Loja confirmada:', storeExists.name, '(ID:', storeExists.id, ', tipo no banco:', typeof storeExists.id, ')');
            }
        } catch (storeError) {
            console.error('❌ Erro ao verificar loja:', storeError);
        }
        
        // Garantir que seja sempre INTEGER para o banco
        const finalStoreId = parseInt(storeId);
        console.log('💾 Store_id que será salvo:', finalStoreId, '(tipo:', typeof finalStoreId, ')');

        // Criar devolução
        console.log('💾 Criando devolução no banco de dados...');
        
        // Validar e preparar valores
        const originalPrice = parseFloat(saleItem.unit_price) || 0;
        const paymentMethod = sale.payment_method || 'Não informado';
        const customerId = sale.customer_id || null;
        // finalStoreId será definido após verificação da loja
        
        // Validar valores obrigatórios
        if (!originalPrice || originalPrice <= 0) {
            console.error('❌ Preço original inválido:', saleItem.unit_price);
            return res.status(400).json({ error: 'Preço original do item inválido' });
        }
        
        if (!paymentMethod || paymentMethod.trim() === '') {
            console.error('❌ Método de pagamento inválido:', sale.payment_method);
            return res.status(400).json({ error: 'Método de pagamento inválido' });
        }
        
        console.log('📋 Dados da devolução:', {
            returnNumber,
            sale_id,
            sale_item_id,
            product_id,
            customer_id: customerId,
            storeId: finalStoreId,
            defect_description,
            action_type,
            original_price: originalPrice,
            original_payment_method: paymentMethod,
            replacementProductId,
            replacementPrice,
            priceDifference,
            refundAmount
        });
        
        const result = await db.run(
                `INSERT INTO returns 
                 (return_number, sale_id, sale_item_id, product_id, customer_id, store_id,
                  defect_description, action_type, original_price, original_payment_method,
                  replacement_product_id, replacement_price, price_difference, refund_amount,
                  observations, processed_by, status, processed_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    returnNumber,
                    parseInt(sale_id),
                    parseInt(sale_item_id),
                    parseInt(product_id),
                    customerId,
                    finalStoreId, // Já é INTEGER
                    defect_description,
                    action_type,
                    originalPrice,
                    paymentMethod,
                    replacementProductId ? parseInt(replacementProductId) : null,
                    replacementPrice || null,
                    priceDifference || 0,
                    refundAmount || null,
                    observations || null,
                    action_type === 'same_product' ? parseInt(req.user.id) : null,
                    action_type === 'same_product' ? 'completed' : 'pending',
                    action_type === 'same_product' ? new Date().toISOString() : null
                ]
            );

        const returnId = result.lastID;
        console.log('✅ Devolução criada com ID:', returnId);
        
        if (!returnId) {
            throw new Error('Falha ao criar devolução: ID não retornado');
        }
        
        // Verificar se o store_id foi salvo corretamente e garantir que seja INTEGER
        try {
            const savedReturn = await db.get('SELECT id, return_number, store_id, typeof(store_id) as store_id_type FROM returns WHERE id = ?', [returnId]);
            console.log('🔍 Devolução salva verificada:', {
                id: savedReturn.id,
                return_number: savedReturn.return_number,
                store_id: savedReturn.store_id,
                store_id_type: savedReturn.store_id_type,
                expected_store_id: finalStoreId
            });
            
            // Sempre garantir que o store_id seja INTEGER no banco
            const savedStoreId = parseInt(savedReturn.store_id);
            if (savedStoreId !== finalStoreId || savedReturn.store_id_type !== 'integer') {
                console.warn('⚠️ Store_id não corresponde ou não é INTEGER! Corrigindo...');
                console.warn('⚠️ Store_id salvo:', savedReturn.store_id, 'Tipo:', savedReturn.store_id_type);
                console.warn('⚠️ Store_id esperado:', finalStoreId, 'Tipo:', typeof finalStoreId);
                
                // Forçar atualização para garantir que seja INTEGER
                await db.run('UPDATE returns SET store_id = ? WHERE id = ?', [finalStoreId, returnId]);
                
                // Verificar novamente
                const recheck = await db.get('SELECT store_id, typeof(store_id) as store_id_type FROM returns WHERE id = ?', [returnId]);
                console.log('✅ Store_id corrigido. Novo valor:', recheck.store_id, 'Tipo:', recheck.store_id_type);
            } else {
                console.log('✅ Store_id está correto e é INTEGER');
            }
        } catch (verifyError) {
            console.error('❌ Erro ao verificar store_id salvo:', verifyError);
        }
        
        // VERIFICAÇÃO CRÍTICA: Testar se a devolução pode ser encontrada pela query de busca
        try {
            console.log('🔍 TESTE: Verificando se devolução pode ser encontrada pela query de busca...');
            const testQuery = `
                SELECT r.*,
                       s.sale_number,
                       s.payment_method as original_payment_method,
                       s.installments,
                       p.name as product_name,
                       p.barcode as product_barcode,
                       c.name as customer_name,
                       c.document as customer_document,
                       st.name as store_name,
                       u.name as processed_by_name,
                       rp.name as replacement_product_name
                FROM returns r
                LEFT JOIN sales s ON r.sale_id = s.id
                LEFT JOIN products p ON r.product_id = p.id
                LEFT JOIN customers c ON r.customer_id = c.id
                LEFT JOIN stores st ON r.store_id = st.id
                LEFT JOIN users u ON r.processed_by = u.id
                LEFT JOIN products rp ON r.replacement_product_id = rp.id
                WHERE CAST(r.store_id AS INTEGER) = ? AND r.id = ?
            `;
            const testResult = await db.all(testQuery, [finalStoreId, returnId]);
            console.log('🔍 TESTE: Query de busca encontrou', testResult.length, 'devolução(ões)');
            if (testResult.length === 0) {
                console.error('❌ PROBLEMA CRÍTICO: Devolução criada mas não encontrada pela query de busca!');
                console.error('❌ Store_id usado na busca:', finalStoreId, 'Tipo:', typeof finalStoreId);
                console.error('❌ Return ID:', returnId);
                
                // Tentar buscar sem CAST para ver se encontra
                const testQuery2 = `SELECT * FROM returns WHERE id = ?`;
                const testResult2 = await db.get(testQuery2, [returnId]);
                if (testResult2) {
                    console.error('❌ Devolução existe no banco:', {
                        id: testResult2.id,
                        store_id: testResult2.store_id,
                        store_id_type: typeof testResult2.store_id,
                        return_number: testResult2.return_number
                    });
                    
                    // Tentar buscar com store_id como string
                    const testQuery3 = `SELECT * FROM returns WHERE store_id = ? AND id = ?`;
                    const testResult3 = await db.all(testQuery3, [finalStoreId.toString(), returnId]);
                    console.log('🔍 TESTE: Busca com store_id como string encontrou', testResult3.length, 'devolução(ões)');
                    
                    // Tentar buscar sem filtro de store_id
                    const testQuery4 = `SELECT * FROM returns WHERE id = ?`;
                    const testResult4 = await db.all(testQuery4, [returnId]);
                    console.log('🔍 TESTE: Busca sem filtro de store_id encontrou', testResult4.length, 'devolução(ões)');
                } else {
                    console.error('❌ Devolução não existe no banco!');
                }
            } else {
                console.log('✅ TESTE: Devolução pode ser encontrada pela query de busca!');
            }
        } catch (testError) {
            console.error('❌ Erro ao testar busca da devolução:', testError);
        }

        // Processar automaticamente se for troca por outro produto ou reembolso
        let shouldAutoProcess = false;
        if (action_type === 'different_product' || action_type === 'refund') {
            shouldAutoProcess = true;
        }

        // Se for troca pelo mesmo produto, atualizar estoque
        if (action_type === 'same_product') {
            // Devolver produto ao estoque
            await db.run(
                `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                [product_id]
            );

            // Registrar movimentação de estoque
            await db.run(
                `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                 VALUES (?, 'entry', 1, 'Devolução - Troca pelo mesmo produto', ?)`,
                [product_id, req.user.id]
            );
        } else if (shouldAutoProcess && returnId) {
            try {
                console.log('🔄 Processando devolução automaticamente...');
                // Processar automaticamente: atualizar estoque e registrar no caixa
                if (action_type === 'different_product') {
                    // Devolver produto original e remover produto de substituição
                    await db.run(
                        `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                        [product_id]
                    );

                    if (replacementProductId) {
                        await db.run(
                            `UPDATE products SET stock = stock - 1 WHERE id = ?`,
                            [replacementProductId]
                        );

                        // Registrar movimentações de estoque (se a tabela existir)
                        try {
                            await db.run(
                                `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                                 VALUES (?, 'entry', 1, 'Devolução - Produto devolvido', ?)`,
                                [product_id, req.user.id]
                            );

                            await db.run(
                                `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                                 VALUES (?, 'exit', 1, 'Devolução - Produto de substituição', ?)`,
                                [replacementProductId, req.user.id]
                            );
                        } catch (stockError) {
                            console.warn('Aviso: Não foi possível registrar movimentação de estoque:', stockError.message);
                            // Continuar mesmo se não conseguir registrar movimentação de estoque
                        }
                    }
                } else if (action_type === 'refund') {
                    // Devolver produto ao estoque
                    await db.run(
                        `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                        [product_id]
                    );

                    try {
                        await db.run(
                            `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                             VALUES (?, 'entry', 1, 'Devolução - Reembolso', ?)`,
                            [product_id, req.user.id]
                        );
                    } catch (stockError) {
                        console.warn('Aviso: Não foi possível registrar movimentação de estoque:', stockError.message);
                        // Continuar mesmo se não conseguir registrar movimentação de estoque
                    }
                }

                // Registrar movimentação de caixa se houver diferença de preço ou reembolso
                if (action_type === 'different_product' && priceDifference !== 0) {
                    try {
                        // Buscar caixa aberto
                        const today = new Date().toISOString().split('T')[0];
                        const cashControl = await db.get(
                            `SELECT * FROM cash_control 
                             WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
                             AND closing_date IS NULL 
                             AND is_open = 1
                             AND store_id = ?
                             ORDER BY opening_date DESC LIMIT 1`,
                            [today, finalStoreId]
                        );
                        
                        if (cashControl) {
                            // Registrar movimentação de caixa
                            const movementType = priceDifference > 0 ? 'entry' : 'exit';
                            const amount = Math.abs(priceDifference);
                            const description = priceDifference > 0 
                                ? `Devolução - Cliente pagou diferença (Troca: ${returnNumber})`
                                : `Devolução - Loja devolveu diferença (Troca: ${returnNumber})`;
                            
                            await db.run(
                                `INSERT INTO cash_movements (cash_control_id, type, amount, description, user_id, created_at)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [cashControl.id, movementType, amount, description, req.user.id, new Date().toISOString()]
                            );
                        } else {
                            console.warn('Aviso: Caixa não está aberto. Movimentação de caixa não foi registrada.');
                        }
                    } catch (cashError) {
                        console.warn('Aviso: Não foi possível registrar movimentação de caixa:', cashError.message);
                        // Continuar mesmo se não conseguir registrar no caixa
                    }
                } else if (action_type === 'refund' && refundAmount > 0) {
                    try {
                        // Buscar caixa aberto
                        const today = new Date().toISOString().split('T')[0];
                        const cashControl = await db.get(
                            `SELECT * FROM cash_control 
                             WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
                             AND closing_date IS NULL 
                             AND is_open = 1
                             AND store_id = ?
                             ORDER BY opening_date DESC LIMIT 1`,
                            [today, finalStoreId]
                        );
                        
                        if (cashControl) {
                            // Registrar saída de caixa para reembolso
                            await db.run(
                                `INSERT INTO cash_movements (cash_control_id, type, amount, description, user_id, created_at)
                                 VALUES (?, 'exit', ?, ?, ?, ?)`,
                                [cashControl.id, refundAmount, `Devolução - Reembolso (${returnNumber})`, req.user.id, new Date().toISOString()]
                            );
                        } else {
                            console.warn('Aviso: Caixa não está aberto. Movimentação de caixa não foi registrada.');
                        }
                    } catch (cashError) {
                        console.warn('Aviso: Não foi possível registrar movimentação de caixa:', cashError.message);
                        // Continuar mesmo se não conseguir registrar no caixa
                    }
                }

                // Atualizar status para completed
                await db.run(
                    `UPDATE returns 
                     SET status = 'completed',
                         processed_by = ?,
                         processed_at = ?
                     WHERE id = ?`,
                    [req.user.id, new Date().toISOString(), returnId]
                );
            } catch (processError) {
                console.error('❌ Erro ao processar devolução automaticamente:', processError);
                console.error('❌ Stack:', processError.stack);
                // Não lançar erro aqui - a devolução já foi criada, apenas não foi processada
                // O usuário pode processar manualmente depois
            }
        } else {
            console.log('⏭️ Processamento automático não necessário ou returnId não disponível');
        }

        // Buscar devolução completa com informações do produto de substituição
        console.log('🔍 Buscando devolução completa...');
        let returnData;
        try {
            // Tentar buscar com installments primeiro
            returnData = await db.get(
                `SELECT r.*,
                        s.sale_number,
                        s.installments,
                        p.name as product_name,
                        p.barcode as product_barcode,
                        c.name as customer_name,
                        c.cpf_cnpj as customer_document,
                        st.name as store_name,
                        rp.name as replacement_product_name,
                        rp.barcode as replacement_product_barcode
                 FROM returns r
                 LEFT JOIN sales s ON r.sale_id = s.id
                 LEFT JOIN products p ON r.product_id = p.id
                 LEFT JOIN customers c ON r.customer_id = c.id
                 LEFT JOIN stores st ON r.store_id = st.id
                 LEFT JOIN products rp ON r.replacement_product_id = rp.id
                 WHERE r.id = ?`,
                [returnId]
            );
        } catch (queryError) {
            // Se falhar por causa da coluna installments, tentar sem ela
            console.warn('⚠️ Erro ao buscar com installments, tentando sem:', queryError.message);
            returnData = await db.get(
                `SELECT r.*,
                        s.sale_number,
                        p.name as product_name,
                        p.barcode as product_barcode,
                        c.name as customer_name,
                        c.cpf_cnpj as customer_document,
                        st.name as store_name,
                        rp.name as replacement_product_name,
                        rp.barcode as replacement_product_barcode
                 FROM returns r
                 LEFT JOIN sales s ON r.sale_id = s.id
                 LEFT JOIN products p ON r.product_id = p.id
                 LEFT JOIN customers c ON r.customer_id = c.id
                 LEFT JOIN stores st ON r.store_id = st.id
                 LEFT JOIN products rp ON r.replacement_product_id = rp.id
                 WHERE r.id = ?`,
                [returnId]
            );
            // Adicionar installments como null se não existir
            returnData.installments = null;
        }
        
        console.log('✅ Devolução completa buscada:', returnData.return_number);
        
        // VERIFICAÇÃO FINAL: Garantir que a devolução pode ser encontrada pela query de busca
        // Isso garante que o commit foi feito e a devolução está disponível
        try {
            console.log('🔍 VERIFICAÇÃO FINAL: Testando busca imediata da devolução criada...');
            const finalTestQuery = `SELECT * FROM returns WHERE id = ? AND store_id = ?`;
            const finalTest = await db.get(finalTestQuery, [returnId, finalStoreId]);
            if (finalTest) {
                console.log('✅ VERIFICAÇÃO FINAL: Devolução pode ser encontrada imediatamente após criação!');
                console.log('✅ Store_id confirmado:', finalTest.store_id, 'Tipo no banco:', typeof finalTest.store_id);
            } else {
                console.error('❌ VERIFICAÇÃO FINAL: Devolução NÃO pode ser encontrada imediatamente!');
                console.error('❌ Isso indica problema de commit ou timing');
                // Tentar buscar sem filtro de store_id
                const testWithoutStoreFilter = await db.get(`SELECT * FROM returns WHERE id = ?`, [returnId]);
                if (testWithoutStoreFilter) {
                    console.error('❌ Devolução existe mas store_id não corresponde:', {
                        saved: testWithoutStoreFilter.store_id,
                        expected: finalStoreId
                    });
                }
            }
        } catch (finalTestError) {
            console.error('❌ Erro na verificação final:', finalTestError);
        }
        
        res.status(201).json(returnData);
    } catch (error) {
        console.error('❌ Erro ao criar devolução:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Detalhes do erro:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sql: error.sql,
            params: error.params
        });
        
        // Mensagem de erro mais específica
        let errorMessage = 'Erro ao criar devolução';
        if (error.code === 'SQLITE_CONSTRAINT') {
            if (error.message.includes('FOREIGN KEY')) {
                errorMessage = 'Erro de integridade: referência inválida (venda, produto ou cliente não encontrado)';
            } else if (error.message.includes('UNIQUE')) {
                errorMessage = 'Número de devolução já existe. Tente novamente.';
            } else {
                errorMessage = 'Erro de validação: ' + error.message;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.message || 'Erro desconhecido',
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

// Processar devolução (troca por outro produto ou reembolso)
router.put('/:id/process', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        const { id } = req.params;
        const { replacement_product_id, refund_amount, observations } = req.body;

        // Buscar devolução
        const returnData = await db.get('SELECT * FROM returns WHERE id = ?', [id]);
        if (!returnData) {
            return res.status(404).json({ error: 'Devolução não encontrada' });
        }

        if (returnData.status !== 'pending') {
            return res.status(400).json({ error: 'Devolução já foi processada ou cancelada' });
        }

        let replacementProductId = returnData.replacement_product_id;
        let replacementPrice = returnData.replacement_price;
        let priceDifference = returnData.price_difference;
        let refundAmount = returnData.refund_amount;

        // Se for troca por outro produto
        if (returnData.action_type === 'different_product') {
            if (replacement_product_id && replacement_product_id !== returnData.replacement_product_id) {
                const replacementProduct = await db.get('SELECT * FROM products WHERE id = ?', [replacement_product_id]);
                if (!replacementProduct) {
                    return res.status(404).json({ error: 'Produto de substituição não encontrado' });
                }

                replacementProductId = replacement_product_id;
                replacementPrice = replacementProduct.sale_price || replacementProduct.cost_price || 0;
                priceDifference = replacementPrice - returnData.original_price;
            }

            // Atualizar estoque: devolver produto original e remover produto de substituição
            await db.run(
                `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                [returnData.product_id]
            );

            if (replacementProductId) {
                await db.run(
                    `UPDATE products SET stock = stock - 1 WHERE id = ?`,
                    [replacementProductId]
                );

                // Registrar movimentações de estoque
                await db.run(
                    `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                     VALUES (?, 'entry', 1, 'Devolução - Produto devolvido', ?)`,
                    [returnData.product_id, req.user.id]
                );

                await db.run(
                    `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                     VALUES (?, 'exit', 1, 'Devolução - Produto de substituição', ?)`,
                    [replacementProductId, req.user.id]
                );
            }
        } else if (returnData.action_type === 'refund') {
            // Para reembolso, apenas devolver produto ao estoque
            await db.run(
                `UPDATE products SET stock = stock + 1 WHERE id = ?`,
                [returnData.product_id]
            );

            await db.run(
                `INSERT INTO stock_movements (product_id, type, quantity, reason, user_id)
                 VALUES (?, 'entry', 1, 'Devolução - Reembolso', ?)`,
                [returnData.product_id, req.user.id]
            );
        }

        // Registrar movimentação de caixa se houver diferença de preço ou reembolso
        if (returnData.action_type === 'different_product' && priceDifference !== 0) {
            // Buscar caixa aberto
            const today = new Date().toISOString().split('T')[0];
            const cashControl = await db.get(
                `SELECT * FROM cash_control 
                 WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
                 AND closing_date IS NULL 
                 AND is_open = 1
                 AND store_id = ?
                 ORDER BY opening_date DESC LIMIT 1`,
                [today, returnData.store_id]
            );
            
            if (cashControl) {
                // Registrar movimentação de caixa
                const movementType = priceDifference > 0 ? 'entry' : 'exit';
                const amount = Math.abs(priceDifference);
                const description = priceDifference > 0 
                    ? `Devolução - Cliente pagou diferença (Troca: ${returnData.return_number})`
                    : `Devolução - Loja devolveu diferença (Troca: ${returnData.return_number})`;
                
                await db.run(
                    `INSERT INTO cash_movements (cash_control_id, type, amount, description, user_id, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [cashControl.id, movementType, amount, description, req.user.id, new Date().toISOString()]
                );
            }
        } else if (returnData.action_type === 'refund' && refundAmount > 0) {
            // Buscar caixa aberto
            const today = new Date().toISOString().split('T')[0];
            const cashControl = await db.get(
                `SELECT * FROM cash_control 
                 WHERE DATE(datetime(opening_date, '-3 hours')) = ? 
                 AND closing_date IS NULL 
                 AND is_open = 1
                 AND store_id = ?
                 ORDER BY opening_date DESC LIMIT 1`,
                [today, returnData.store_id]
            );
            
            if (cashControl) {
                // Registrar saída de caixa para reembolso
                await db.run(
                    `INSERT INTO cash_movements (cash_control_id, type, amount, description, user_id, created_at)
                     VALUES (?, 'exit', ?, ?, ?, ?)`,
                    [cashControl.id, refundAmount, `Devolução - Reembolso (${returnData.return_number})`, req.user.id, new Date().toISOString()]
                );
            }
        }

        // Atualizar devolução
        await db.run(
            `UPDATE returns 
             SET replacement_product_id = ?,
                 replacement_price = ?,
                 price_difference = ?,
                 refund_amount = ?,
                 status = 'completed',
                 processed_by = ?,
                 processed_at = ?,
                 observations = COALESCE(?, observations)
             WHERE id = ?`,
            [
                replacementProductId,
                replacementPrice,
                priceDifference,
                refundAmount,
                req.user.id,
                new Date().toISOString(),
                observations,
                id
            ]
        );

        // Buscar devolução atualizada
        const updatedReturn = await db.get(
            `SELECT r.*,
                    s.sale_number,
                    p.name as product_name,
                    rp.name as replacement_product_name,
                    c.name as customer_name,
                    st.name as store_name,
                    u.name as processed_by_name
             FROM returns r
             LEFT JOIN sales s ON r.sale_id = s.id
             LEFT JOIN products p ON r.product_id = p.id
             LEFT JOIN products rp ON r.replacement_product_id = rp.id
             LEFT JOIN customers c ON r.customer_id = c.id
             LEFT JOIN stores st ON r.store_id = st.id
             LEFT JOIN users u ON r.processed_by = u.id
             WHERE r.id = ?`,
            [id]
        );

        res.json(updatedReturn);
    } catch (error) {
        console.error('Erro ao processar devolução:', error);
        res.status(500).json({ error: 'Erro ao processar devolução' });
    }
});

// Cancelar devolução
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const { id } = req.params;

        const returnData = await db.get('SELECT * FROM returns WHERE id = ?', [id]);
        if (!returnData) {
            return res.status(404).json({ error: 'Devolução não encontrada' });
        }

        if (returnData.status !== 'pending') {
            return res.status(400).json({ error: 'Apenas devoluções pendentes podem ser canceladas' });
        }

        await db.run(
            `UPDATE returns SET status = 'cancelled', processed_by = ?, processed_at = ? WHERE id = ?`,
            [req.user.id, new Date().toISOString(), id]
        );

        res.json({ message: 'Devolução cancelada com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar devolução:', error);
        res.status(500).json({ error: 'Erro ao cancelar devolução' });
    }
});

// Estatísticas de devoluções
router.get('/stats/summary', auth, async (req, res) => {
    try {
        // Garantir que a tabela existe
        await ensureReturnsTableExists();
        
        const { store_id } = req.query;
        
        const filter = getStoreFilter(req.user, store_id);
        let sql = `SELECT 
            COUNT(*) as total_returns,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_returns,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_returns,
            SUM(CASE WHEN action_type = 'same_product' THEN 1 ELSE 0 END) as same_product_exchanges,
            SUM(CASE WHEN action_type = 'different_product' THEN 1 ELSE 0 END) as different_product_exchanges,
            SUM(CASE WHEN action_type = 'refund' THEN 1 ELSE 0 END) as refunds,
            SUM(COALESCE(refund_amount, 0)) as total_refunded
        FROM returns WHERE 1=1`;
        const params = [];

        // Filtrar por loja - mesma lógica da rota principal
        if (filter.store_id !== null && filter.store_id !== undefined) {
            const storeIdNum = parseInt(filter.store_id);
            if (!isNaN(storeIdNum)) {
                sql += ` AND CAST(store_id AS INTEGER) = ?`;
                params.push(storeIdNum);
            }
        }
        // Se canSeeAll é true e não há store_id, não adicionar filtro (ver todas)

        const stats = await db.get(sql, params);
        res.json(stats);
    } catch (error) {
        console.error('Erro ao obter estatísticas de devoluções:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});

module.exports = router;

