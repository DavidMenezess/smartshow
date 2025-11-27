// ========================================
// CLIENTE API
// ========================================

const API_BASE_URL = '/api';

class API {
    constructor() {
        this.updateToken();
    }

    updateToken() {
        this.token = localStorage.getItem('token');
    }

    async request(endpoint, methodOrOptions = 'GET', bodyOrOptions = null) {
        // Atualizar token antes de cada requisição
        this.updateToken();
        
        // Verificar se há token (exceto para login)
        if (!this.token && !endpoint.includes('/auth/login')) {
            console.warn('⚠️ Token não encontrado para requisição:', endpoint);
            // Não lançar erro aqui, apenas avisar - pode ser que o token esteja sendo carregado
            // O servidor vai retornar 401 se não houver token válido
        }
        
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Suportar ambos os formatos: novo (method, body) e antigo (options)
        let method = 'GET';
        let body = null;
        let returnNullOn404 = false;
        
        if (typeof methodOrOptions === 'string') {
            // Novo formato: request(endpoint, method, body)
            method = methodOrOptions;
            body = bodyOrOptions;
        } else if (typeof methodOrOptions === 'object' && methodOrOptions !== null) {
            // Formato antigo: request(endpoint, options)
            method = methodOrOptions.method || 'GET';
            body = methodOrOptions.body ? JSON.parse(methodOrOptions.body) : null;
            returnNullOn404 = methodOrOptions.returnNullOn404 || false;
        }
        
        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };
        
        // Log para debug (apenas em desenvolvimento)
        if (process.env.NODE_ENV !== 'production') {
            console.log('📤 Requisição:', method, url, { hasToken: !!this.token });
        }

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, config);
            
            // Se for 404 e foi solicitado retornar null, retornar null sem fazer parse
            if (response.status === 404 && returnNullOn404) {
                return null;
            }
            
            // Tentar fazer parse do JSON apenas se houver conteúdo
            let data = null;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (text && text.trim()) {
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        console.error('❌ Erro ao fazer parse do JSON:', parseError, 'Texto:', text);
                        throw new Error('Resposta inválida do servidor');
                    }
                }
            } else if (response.status === 200 && !contentType) {
                // Se não há content-type mas status é 200, pode ser resposta vazia
                data = null;
            }

            if (!response.ok) {
                const errorMessage = data?.error || data?.details || data?.message || `Erro na requisição (${response.status})`;
                console.error('❌ Erro na API:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorMessage,
                    data: data,
                    endpoint: url
                });
                
                // Se for erro 401, pode ser token expirado
                if (response.status === 401) {
                    // Limpar token inválido
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    this.token = null;
                    throw new Error('Sessão expirada. Por favor, faça login novamente.');
                }
                
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('❌ Erro na API:', error);
            // Se o erro já tem mensagem, manter; senão, adicionar uma genérica
            if (!error.message || error.message === 'Failed to fetch') {
                throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
            }
            throw error;
        }
    }

    // Auth
    async login(username, password) {
        // Fazer login sem token primeiro
        const url = `${API_BASE_URL}/auth/login`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao fazer login');
        }
        
        const data = await response.json();
        if (data.token) {
            this.token = data.token;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    }

    async verifyToken() {
        return await this.request('/auth/verify');
    }

    // Products
    async getProducts(search, category, active) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (category) params.append('category', category);
        if (active !== undefined) params.append('active', active);
        return await this.request(`/products?${params}`);
    }

    async getProductByBarcode(barcode) {
        try {
            return await this.request(`/products/barcode/${barcode}`, { returnNullOn404: true });
        } catch (error) {
            // Se retornar 404, retornar null em vez de lançar erro
            if (error.message && error.message.includes('não encontrado')) {
                return null;
            }
            throw error;
        }
    }

    async createProduct(product) {
        return await this.request('/products', 'POST', product);
    }

    async updateProduct(id, product) {
        return await this.request(`/products/${id}`, 'PUT', product);
    }

    // Sales
    async getSales(startDate, endDate, customerId, sellerId) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (customerId) params.append('customerId', customerId);
        if (sellerId) params.append('sellerId', sellerId);
        return await this.request(`/sales?${params}`);
    }

    async getSale(id) {
        return await this.request(`/sales/${id}`);
    }

    async createSale(sale) {
        return await this.request('/sales', 'POST', sale);
    }

    // Customers
    async getCustomers(search, active) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (active !== undefined) params.append('active', active);
        return await this.request(`/customers?${params}`);
    }

    async createCustomer(customer) {
        return await this.request('/customers', 'POST', customer);
    }

    // Reports
    async getDashboard() {
        return await this.request('/reports/dashboard');
    }

    async getSalesReport(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return await this.request(`/reports/sales?${params}`);
    }

    async getTodaySales() {
        // Usar data atual no timezone do Brasil (UTC-3)
        const now = new Date();
        const brazilOffset = -3 * 60; // UTC-3 em minutos
        const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60 * 1000);
        const today = brazilTime.toISOString().split('T')[0];
        
        console.log(`📅 Buscando vendas do dia: ${today}`);
        const result = await this.request(`/reports/today-sales?date=${today}`);
        console.log(`📊 Resultado da API:`, result);
        return result;
    }

    async getCashStatus() {
        return await this.request('/cash/status');
    }

    async openCash(initialCash, observations) {
        return await this.request('/cash/open', 'POST', {
            initialCash: parseFloat(initialCash) || 0,
            observations: observations || ''
        });
    }

    async closeCash(finalCash, observations) {
        return await this.request('/cash/close', 'POST', {
            finalCash: parseFloat(finalCash) || 0,
            observations: observations || ''
        });
    }

    // Print
    async printFiscalReceipt(sale) {
        return await this.request('/print/fiscal/receipt', {
            method: 'POST',
            body: JSON.stringify(sale)
        });
    }

    async generateSaleNotePDF(sale) {
        return await this.request('/print/pdf/sale-note', {
            method: 'POST',
            body: JSON.stringify(sale)
        });
    }

    // Users
    async getUsers() {
        return await this.request('/users');
    }

    async getUser(id) {
        return await this.request(`/users/${id}`);
    }

    async createUser(user) {
        return await this.request('/users', 'POST', user);
    }

    async updateUser(id, user) {
        return await this.request(`/users/${id}`, 'PUT', user);
    }

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Stores
    async getStores() {
        return await this.request('/stores');
    }

    async getStore(id) {
        return await this.request(`/stores/${id}`);
    }

    async createStore(store) {
        return await this.request('/stores', 'POST', store);
    }

    async updateStore(id, store) {
        return await this.request(`/stores/${id}`, 'PUT', store);
    }

    async deleteStore(id) {
        return await this.request(`/stores/${id}`, 'DELETE');
    }

    // Categories
    async getCategories(search) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        return await this.request(`/categories?${params}`);
    }

    async createCategory(category) {
        return await this.request('/categories', 'POST', category);
    }

    // Service Orders
    async getServiceOrders(status, customerId, technicianId) {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (customerId) params.append('customerId', customerId);
        if (technicianId) params.append('technicianId', technicianId);
        return await this.request(`/service-orders?${params}`);
    }

    async getServiceOrder(id) {
        return await this.request(`/service-orders/${id}`);
    }

    async createServiceOrder(order) {
        return await this.request('/service-orders', 'POST', order);
    }

    async updateServiceOrder(id, order) {
        return await this.request(`/service-orders/${id}`, 'PUT', order);
    }
}

const api = new API();



