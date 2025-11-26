// ========================================
// CLIENTE API
// ========================================

const API_BASE_URL = '/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            
            // Se for 404 e foi solicitado retornar null, retornar null sem fazer parse
            if (response.status === 404 && options.returnNullOn404) {
                return null;
            }
            
            // Tentar fazer parse do JSON apenas se houver conteúdo
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (text) {
                    data = JSON.parse(text);
                }
            }

            if (!response.ok) {
                throw new Error(data?.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('Erro na API:', error);
            throw error;
        }
    }

    // Auth
    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
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
        return await this.request('/products', {
            method: 'POST',
            body: JSON.stringify(product)
        });
    }

    async updateProduct(id, product) {
        return await this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product)
        });
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
        return await this.request('/sales', {
            method: 'POST',
            body: JSON.stringify(sale)
        });
    }

    // Customers
    async getCustomers(search, active) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (active !== undefined) params.append('active', active);
        return await this.request(`/customers?${params}`);
    }

    async createCustomer(customer) {
        return await this.request('/customers', {
            method: 'POST',
            body: JSON.stringify(customer)
        });
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
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(user)
        });
    }

    async updateUser(id, user) {
        return await this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(user)
        });
    }

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }
}

const api = new API();



