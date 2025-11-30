// ========================================
// BANCO DE DADOS SQLITE
// ========================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('./config');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, config.database.sqlite.path);
        this.db = null;
        this.init();
    }

    init() {
        try {
            // Criar diretório se não existir
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            // Garantir permissões de escrita
            try {
                fs.chmodSync(dataDir, 0o755);
            } catch (chmodError) {
                console.warn('⚠️ Não foi possível alterar permissões do diretório:', chmodError.message);
            }

            // Conectar ao banco com tratamento de erro robusto
            try {
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('❌ Erro ao conectar ao banco de dados:', err);
                        // Não crashar, apenas logar o erro
                        return;
                    } else {
                        console.log('✅ Conectado ao banco de dados SQLite');
                        // Criar tabelas de forma assíncrona para não bloquear
                        setImmediate(() => {
                            try {
                                this.createTables();
                            } catch (error) {
                                console.error('❌ Erro ao criar tabelas:', error);
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('❌ Erro ao instanciar Database:', error);
                // Continuar mesmo com erro no banco
            }
        } catch (error) {
            console.error('❌ Erro crítico no init do Database:', error);
            // Não crashar a aplicação
        }
    }

    createTables() {
        const tables = [
            // Lojas/Filiais
            `CREATE TABLE IF NOT EXISTS stores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT,
                city TEXT,
                state TEXT,
                phone TEXT,
                email TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Usuários
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'gerente', 'vendedor', 'tecnico', 'caixa')),
                store_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (store_id) REFERENCES stores(id)
            )`,

            // Categorias de produtos
            `CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Fornecedores
            `CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cnpj TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Produtos
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barcode TEXT,
                name TEXT NOT NULL,
                description TEXT,
                category_id INTEGER,
                supplier_id INTEGER,
                store_id INTEGER,
                brand TEXT,
                model TEXT,
                cost_price REAL DEFAULT 0,
                sale_price REAL NOT NULL,
                stock INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 0,
                image_path TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
                FOREIGN KEY (store_id) REFERENCES stores(id)
            )`,

            // Clientes
            `CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cpf_cnpj TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                zip_code TEXT,
                credit_limit REAL DEFAULT 0,
                store_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (store_id) REFERENCES stores(id)
            )`,

            // Vendas
            `CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_number TEXT UNIQUE NOT NULL,
                customer_id INTEGER,
                seller_id INTEGER NOT NULL,
                store_id INTEGER NOT NULL,
                total REAL NOT NULL,
                discount REAL DEFAULT 0,
                payment_method TEXT NOT NULL,
                fiscal_receipt TEXT,
                status TEXT DEFAULT 'completed',
                observations TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (seller_id) REFERENCES users(id),
                FOREIGN KEY (store_id) REFERENCES stores(id)
            )`,

            // Itens de venda
            `CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total REAL NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`,

            // Ordens de serviço
            `CREATE TABLE IF NOT EXISTS service_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT UNIQUE NOT NULL,
                customer_id INTEGER NOT NULL,
                technician_id INTEGER,
                store_id INTEGER NOT NULL,
                device_type TEXT,
                brand TEXT,
                model TEXT,
                serial_number TEXT,
                problem_description TEXT,
                diagnostic TEXT,
                estimated_value REAL,
                labor_cost REAL DEFAULT 0,
                parts_cost REAL DEFAULT 0,
                total_value REAL DEFAULT 0,
                status TEXT DEFAULT 'aguardando_autorizacao' CHECK(status IN ('pronta', 'aguardando_autorizacao', 'sem_concerto', 'entregue', 'em_manutencao', 'aguardando_peca')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                delivered_at DATETIME,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (technician_id) REFERENCES users(id),
                FOREIGN KEY (store_id) REFERENCES stores(id)
            )`,

            // Controle de caixa
            `CREATE TABLE IF NOT EXISTS cash_control (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                store_id INTEGER NOT NULL,
                opening_date DATETIME NOT NULL,
                closing_date DATETIME,
                initial_cash REAL DEFAULT 0,
                final_cash REAL DEFAULT 0,
                total_sales REAL DEFAULT 0,
                total_expenses REAL DEFAULT 0,
                total_withdrawals REAL DEFAULT 0,
                difference REAL DEFAULT 0,
                observations TEXT,
                is_open BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (store_id) REFERENCES stores(id)
            )`,

            // Contas a receber
            `CREATE TABLE IF NOT EXISTS accounts_receivable (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER,
                service_order_id INTEGER,
                customer_id INTEGER NOT NULL,
                description TEXT,
                due_date DATE NOT NULL,
                amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
                payment_date DATE,
                payment_method TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales(id),
                FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`,

            // Contas a pagar
            `CREATE TABLE IF NOT EXISTS accounts_payable (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_id INTEGER,
                description TEXT NOT NULL,
                due_date DATE NOT NULL,
                amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
                payment_date DATE,
                payment_method TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            )`,

            // Movimentação de estoque
            `CREATE TABLE IF NOT EXISTS stock_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('entry', 'exit', 'adjustment')),
                quantity INTEGER NOT NULL,
                reason TEXT,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,

            // Devoluções de produtos
            `CREATE TABLE IF NOT EXISTS returns (
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
            )`,

            // Movimentações de caixa
            `CREATE TABLE IF NOT EXISTS cash_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cash_control_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('entry', 'exit')),
                amount REAL NOT NULL,
                description TEXT,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cash_control_id) REFERENCES cash_control(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`
        ];

        tables.forEach((sql, index) => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error(`❌ Erro ao criar tabela ${index + 1}:`, err);
                } else {
                    console.log(`✅ Tabela ${index + 1} criada/verificada`);
                }
            });
        });

        // Migrações: adicionar colunas se não existirem
        setTimeout(async () => {
            try {
                await this.runMigrations();
            } catch (error) {
                console.error('❌ Erro ao executar migrações:', error);
            }
        }, 500);

        // Inserir dados iniciais
        // Inserir dados iniciais de forma segura
        setTimeout(() => {
            try {
                this.insertInitialData();
            } catch (error) {
                console.error('❌ Erro ao inserir dados iniciais:', error);
            }
        }, 1000);
    }

    async runMigrations() {
        // Adicionar coluna installments na tabela sales se não existir
        try {
            const columnExists = await this.get(
                `SELECT COUNT(*) as count FROM pragma_table_info('sales') WHERE name='installments'`
            );
            
            if (columnExists && columnExists.count === 0) {
                console.log('🔄 Adicionando coluna installments na tabela sales...');
                await this.run(`ALTER TABLE sales ADD COLUMN installments INTEGER DEFAULT NULL`);
                console.log('✅ Coluna installments adicionada com sucesso');
            }
        } catch (error) {
            console.error('❌ Erro ao adicionar coluna installments:', error);
        }

        // Migrações para multi-loja: adicionar store_id nas tabelas
        const migrations = [
            { table: 'users', column: 'store_id', type: 'INTEGER', fk: 'stores(id)' },
            { table: 'products', column: 'store_id', type: 'INTEGER', fk: 'stores(id)' },
            { table: 'customers', column: 'store_id', type: 'INTEGER', fk: 'stores(id)' },
            { table: 'sales', column: 'store_id', type: 'INTEGER NOT NULL DEFAULT 1', fk: 'stores(id)' },
            { table: 'service_orders', column: 'store_id', type: 'INTEGER NOT NULL DEFAULT 1', fk: 'stores(id)' },
            { table: 'cash_control', column: 'store_id', type: 'INTEGER NOT NULL DEFAULT 1', fk: 'stores(id)' }
        ];

        for (const migration of migrations) {
            try {
                const columnExists = await this.get(
                    `SELECT COUNT(*) as count FROM pragma_table_info('${migration.table}') WHERE name='${migration.column}'`
                );
                
                if (columnExists && columnExists.count === 0) {
                    console.log(`🔄 Adicionando coluna ${migration.column} na tabela ${migration.table}...`);
                    await this.run(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.type}`);
                    if (migration.fk) {
                        // SQLite não suporta ADD FOREIGN KEY em ALTER TABLE, então apenas adicionamos a coluna
                        console.log(`✅ Coluna ${migration.column} adicionada (FK será aplicada na próxima criação da tabela)`);
                    } else {
                        console.log(`✅ Coluna ${migration.column} adicionada com sucesso`);
                    }
                }
            } catch (error) {
                console.error(`❌ Erro ao adicionar coluna ${migration.column} na tabela ${migration.table}:`, error);
            }
        }

        // Criar loja padrão se não existir
        try {
            const storeExists = await this.get(`SELECT COUNT(*) as count FROM stores`);
            if (storeExists && storeExists.count === 0) {
                console.log('🔄 Criando loja padrão...');
                await this.run(
                    `INSERT INTO stores (name, address, city, state, is_active) VALUES (?, ?, ?, ?, ?)`,
                    ['Loja Principal', 'Endereço não informado', 'Cidade não informada', 'Estado não informado', 1]
                );
                console.log('✅ Loja padrão criada com sucesso');
            }
        } catch (error) {
            console.error('❌ Erro ao criar loja padrão:', error);
        }
    }

    async insertInitialData() {
        // Verificar se já existem usuários
        this.db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) {
                console.error('Erro ao verificar usuários:', err);
                return;
            }

            if (row.count === 0) {
                console.log('📝 Inserindo usuários iniciais...');
                
                // Primeiro, garantir que existe uma loja
                this.db.get("SELECT id FROM stores LIMIT 1", async (err, storeRow) => {
                    if (err) {
                        console.error('Erro ao buscar loja:', err);
                        return;
                    }
                    
                    let storeId = 1; // Default
                    if (storeRow) {
                        storeId = storeRow.id;
                    }
                    
                    const bcrypt = require('bcryptjs');
                    const initialUsers = [
                        {
                            username: 'admin',
                            password: bcrypt.hashSync('admin123', 10),
                            name: 'Administrador',
                            role: 'admin',
                            store_id: null // Admin não tem loja específica
                        },
                        {
                            username: 'vendedor',
                            password: bcrypt.hashSync('vendedor123', 10),
                            name: 'Vendedor',
                            role: 'vendedor',
                            store_id: storeId
                        },
                        {
                            username: 'caixa',
                            password: bcrypt.hashSync('caixa123', 10),
                            name: 'Caixa',
                            role: 'caixa',
                            store_id: storeId
                        },
                        {
                            username: 'tecnico',
                            password: bcrypt.hashSync('tecnico123', 10),
                            name: 'Técnico',
                            role: 'tecnico',
                            store_id: storeId
                        }
                    ];

                    const insertUser = `INSERT INTO users (username, password, name, role, store_id) VALUES (?, ?, ?, ?, ?)`;

                    initialUsers.forEach(user => {
                        this.db.run(insertUser, [user.username, user.password, user.name, user.role, user.store_id], (err) => {
                            if (err) {
                                console.error('Erro ao inserir usuário:', err);
                            } else {
                                console.log(`✅ Usuário ${user.username} inserido`);
                            }
                        });
                    });
                });
            }
        });
    }


    // Métodos auxiliares
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Erro ao fechar banco de dados:', err);
                } else {
                    console.log('✅ Conexão com banco de dados fechada');
                }
            });
        }
    }
}

module.exports = new Database();


