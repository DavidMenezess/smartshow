// ========================================
// PDV - PONTO DE VENDA
// ========================================

class PDV {
    constructor() {
        this.cart = [];
        this.currentSale = null;
        this.discount = 0;
        this.searchResults = []; // Armazenar resultados da busca
        this.init();
    }

    init() {
        // Inicializar leitor de código de barras
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) {
            this.barcodeReader = new BarcodeReader(barcodeInput, (product) => {
                this.addToCart(product);
                this.updateBarcodeStatus(true, true);
            });
        }
        
        // Inicializar busca por nome
        this.initNameSearch();

        // Event listeners
        document.getElementById('discount')?.addEventListener('input', () => {
            this.updateTotals();
        });

        // Função para atualizar visibilidade do campo Valor Pago e Parcelas
        // Tornar global para poder ser chamada de outros lugares
        window.updatePaymentFieldsVisibility = () => {
            const paidAmountGroup = document.getElementById('paidAmountGroup');
            const installmentsGroup = document.getElementById('installmentsGroup');
            const creditInfo = document.getElementById('creditInfo');
            const paymentMethodSelect = document.getElementById('paymentMethod');
            
            if (!paymentMethodSelect) {
                console.error('❌ Campo paymentMethod não encontrado no DOM!');
                return;
            }
            
            const paymentMethod = paymentMethodSelect.value;
            
            console.log('🔄 Atualizando campos de pagamento. Método selecionado:', paymentMethod);
            console.log('🔍 Elementos encontrados:', {
                paidAmountGroup: !!paidAmountGroup,
                installmentsGroup: !!installmentsGroup,
                creditInfo: !!creditInfo
            });
            
            // Campo Valor Pago (apenas para Dinheiro)
            if (paymentMethod === 'Dinheiro') {
                if (paidAmountGroup) {
                    paidAmountGroup.style.display = 'block';
                    console.log('✅ Campo Valor Pago exibido');
                } else {
                    console.warn('⚠️ paidAmountGroup não encontrado');
                }
            } else {
                if (paidAmountGroup) {
                    paidAmountGroup.style.display = 'none';
                }
            }
            
            // Campo Parcelas (apenas para Cartão de Crédito)
            if (paymentMethod === 'Cartão de Crédito') {
                if (installmentsGroup) {
                    installmentsGroup.style.display = 'block';
                    console.log('✅ Campo Parcelas exibido (display: block)');
                } else {
                    console.error('❌ installmentsGroup não encontrado no DOM!');
                }
                if (creditInfo) {
                    creditInfo.style.display = 'block';
                    console.log('✅ Informação de crédito exibida (display: block)');
                } else {
                    console.error('❌ creditInfo não encontrado no DOM!');
                }
            } else {
                if (installmentsGroup) {
                    installmentsGroup.style.display = 'none';
                }
                if (creditInfo) {
                    creditInfo.style.display = 'none';
                }
            }
        };
        
        const updatePaymentFieldsVisibility = window.updatePaymentFieldsVisibility;

        // Verificar visibilidade inicial
        updatePaymentFieldsVisibility();

        // Adicionar listener para mudança no método de pagamento
        const paymentMethodSelect = document.getElementById('paymentMethod');
        if (paymentMethodSelect) {
            paymentMethodSelect.addEventListener('change', (e) => {
                console.log('💳 Método de pagamento alterado para:', e.target.value);
                updatePaymentFieldsVisibility();
                if (e.target.value === 'Dinheiro') {
                    const paidAmountInput = document.getElementById('paidAmount');
                    if (paidAmountInput) {
                        // Remover listeners anteriores para evitar duplicação
                        const newInput = paidAmountInput.cloneNode(true);
                        paidAmountInput.parentNode.replaceChild(newInput, paidAmountInput);
                        newInput.addEventListener('input', () => {
                            this.calculateChange();
                        });
                    }
                }
            });
        } else {
            console.error('❌ Campo paymentMethod não encontrado!');
        }

        document.getElementById('finalizeSaleBtn')?.addEventListener('click', () => {
            this.finalizeSale();
        });

        document.getElementById('printReceiptBtn')?.addEventListener('click', () => {
            this.printReceipt();
        });

        document.getElementById('cancelSaleBtn')?.addEventListener('click', () => {
            this.cancelSale();
        });

        // Inicializar busca de clientes
        this.initCustomerSearch();

        // Inicializar venda
        this.initSale();
        
        // Garantir que os campos de pagamento estejam visíveis corretamente após inicialização
        setTimeout(() => {
            if (window.updatePaymentFieldsVisibility) {
                window.updatePaymentFieldsVisibility();
            }
        }, 100);
    }

    initSale() {
        this.cart = [];
        this.discount = 0;
        this.currentSale = {
            saleNumber: `VENDA-${Date.now()}`,
            createdAt: new Date().toISOString()
        };

        document.getElementById('saleNumber').textContent = this.currentSale.saleNumber;
        // Corrigir timezone para Brasil
        const now = new Date();
        const brazilDate = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
        document.getElementById('saleDate').textContent = brazilDate.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Limpar campo de cliente
        const customerSearch = document.getElementById('customerSearch');
        const customerId = document.getElementById('customerId');
        if (customerSearch) customerSearch.value = '';
        if (customerId) customerId.value = '';
        
        // Limpar outros campos
        document.getElementById('discount').value = '0';
        document.getElementById('observations').value = '';
        document.getElementById('paidAmount').value = '';
        document.getElementById('changeDisplay').style.display = 'none';
        
        // Limpar campo de parcelas
        const installmentsSelect = document.getElementById('installments');
        if (installmentsSelect) {
            installmentsSelect.value = '1';
        }
        
        // Atualizar visibilidade dos campos de pagamento usando a função centralizada
        if (window.updatePaymentFieldsVisibility) {
            window.updatePaymentFieldsVisibility();
        } else {
            // Fallback: atualizar manualmente
            const paymentMethod = document.getElementById('paymentMethod')?.value;
            const paidAmountGroup = document.getElementById('paidAmountGroup');
            const installmentsGroup = document.getElementById('installmentsGroup');
            const creditInfo = document.getElementById('creditInfo');
            
            console.log('🔄 Atualizando campos de pagamento no initSale. Método:', paymentMethod);
            
            if (paymentMethod === 'Dinheiro' && paidAmountGroup) {
                paidAmountGroup.style.display = 'block';
            } else if (paidAmountGroup) {
                paidAmountGroup.style.display = 'none';
            }
            
            if (paymentMethod === 'Cartão de Crédito') {
                if (installmentsGroup) {
                    installmentsGroup.style.display = 'block';
                    console.log('✅ Campo Parcelas exibido no initSale');
                }
                if (creditInfo) {
                    creditInfo.style.display = 'block';
                    console.log('✅ Info de crédito exibida no initSale');
                }
            } else {
                if (installmentsGroup) installmentsGroup.style.display = 'none';
                if (creditInfo) creditInfo.style.display = 'none';
            }
        }
        
        this.updateCart();
    }

    addToCart(product) {
        const existingItem = this.cart.find(item => item.product_id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.total = existingItem.quantity * existingItem.unit_price;
        } else {
        this.cart.push({
            product_id: product.id,
            name: product.name,
            barcode: product.barcode,
            quantity: 1,
            unit_price: product.sale_price,
            total: product.sale_price
        });
        }

        this.updateCart();
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCart();
    }

    updateQuantity(index, quantity) {
        if (quantity <= 0) {
            this.removeFromCart(index);
            return;
        }
        this.cart[index].quantity = quantity;
        this.cart[index].total = this.cart[index].quantity * this.cart[index].unit_price;
        this.updateCart();
    }

    updateCart() {
        const tbody = document.getElementById('cartItems');
        if (!tbody) return;

        if (this.cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-cart">Carrinho vazio</td></tr>';
        } else {
            tbody.innerHTML = this.cart.map((item, index) => `
                <tr>
                    <td>${item.barcode || '-'}</td>
                    <td>${item.name}</td>
                    <td>
                        <input type="number" value="${item.quantity}" min="1" 
                               onchange="pdv.updateQuantity(${index}, parseInt(this.value))"
                               style="width: 60px;">
                    </td>
                    <td>R$ ${item.unit_price.toFixed(2)}</td>
                    <td>R$ ${item.total.toFixed(2)}</td>
                    <td>
                        <button onclick="pdv.removeFromCart(${index})" class="btn btn-danger" style="padding: 0.25rem 0.5rem;">Remover</button>
                    </td>
                </tr>
            `).join('');
        }

        this.updateTotals();
    }

    updateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
        this.discount = parseFloat(document.getElementById('discount')?.value || 0);
        const total = subtotal - this.discount;

        document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
        document.getElementById('total').textContent = `R$ ${total.toFixed(2)}`;
    }

    calculateChange() {
        const total = parseFloat(document.getElementById('total')?.textContent.replace('R$ ', '').replace(',', '.') || 0);
        const paid = parseFloat(document.getElementById('paidAmount')?.value || 0);
        const change = paid - total;

        const changeDisplay = document.getElementById('changeDisplay');
        const changeValue = document.getElementById('change');

        if (change > 0) {
            changeDisplay.style.display = 'block';
            changeValue.textContent = `R$ ${change.toFixed(2)}`;
        } else {
            changeDisplay.style.display = 'none';
        }
    }

    initCustomerSearch() {
        const customerSearch = document.getElementById('customerSearch');
        const customerId = document.getElementById('customerId');
        const resultsDiv = document.getElementById('customerSearchResults');
        
        if (!customerSearch || !customerId || !resultsDiv) {
            console.warn('⚠️ Elementos de busca de cliente não encontrados');
            return;
        }
        
        console.log('✅ Busca de cliente inicializada');

        let searchTimeout;
        let selectedCustomer = null;

        // Buscar clientes enquanto digita
        customerSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim();
            
            // Se campo estiver vazio, limpar seleção
            if (searchTerm.length === 0) {
                resultsDiv.style.display = 'none';
                customerId.value = '';
                selectedCustomer = null;
                return;
            }
            
            // Buscar após 300ms de inatividade
            if (searchTerm.length >= 2) {
                searchTimeout = setTimeout(async () => {
                    await this.searchCustomers(searchTerm);
                }, 300);
            } else {
                resultsDiv.style.display = 'none';
            }
        });

        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#customerSearch') && !e.target.closest('#customerSearchResults')) {
                resultsDiv.style.display = 'none';
            }
        });

        // Limpar ao pressionar Escape
        customerSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                resultsDiv.style.display = 'none';
                customerSearch.blur();
            }
        });
    }

    async searchCustomers(searchTerm) {
        try {
            console.log('🔍 Buscando clientes:', searchTerm);
            const customers = await api.getCustomers(searchTerm, true);
            console.log('📋 Clientes encontrados:', customers.length);
            
            const resultsDiv = document.getElementById('customerSearchResults');
            const customerSearch = document.getElementById('customerSearch');
            
            if (!resultsDiv || !customerSearch) {
                console.error('❌ Elementos de busca não encontrados');
                return;
            }
            
            if (customers.length === 0) {
                resultsDiv.innerHTML = '<div style="padding: 1rem; text-align: center; color: #718096;">Nenhum cliente encontrado</div>';
                resultsDiv.style.display = 'block';
                return;
            }

            // Mostrar resultados (usar escapeHTML para evitar problemas com caracteres especiais)
            resultsDiv.innerHTML = customers.slice(0, 10).map((customer) => {
                const name = this.escapeHtml(customer.name);
                const cpf = customer.cpf_cnpj ? this.escapeHtml(customer.cpf_cnpj) : '';
                const phone = customer.phone ? this.escapeHtml(customer.phone) : '';
                
                // Escapar aspas para uso em atributos
                const nameAttr = name.replace(/"/g, '&quot;');
                const cpfAttr = cpf.replace(/"/g, '&quot;');
                
                return `
                <div onclick="pdv.selectCustomer(${customer.id}, '${nameAttr}', '${cpfAttr}')" 
                     style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid #e2e8f0; transition: background 0.2s;"
                     onmouseover="this.style.background='#f7fafc'" 
                     onmouseout="this.style.background='white'">
                    <div style="font-weight: 600; color: #2d3748;">${name}</div>
                    <div style="font-size: 0.85rem; color: #718096; margin-top: 0.25rem;">
                        ${cpf ? `CPF/CNPJ: ${cpf}` : ''}
                        ${phone ? (cpf ? ' | ' : '') + `Tel: ${phone}` : ''}
                    </div>
                </div>
            `;
            }).join('');
            
            resultsDiv.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        }
    }

    selectCustomer(customerId, customerName, customerCpf) {
        const customerSearch = document.getElementById('customerSearch');
        const customerIdInput = document.getElementById('customerId');
        const resultsDiv = document.getElementById('customerSearchResults');
        
        if (!customerSearch || !customerIdInput) return;
        
        // Mostrar nome e CPF no campo
        const displayText = customerCpf && customerCpf !== 'null' && customerCpf !== ''
            ? `${customerName} (${customerCpf})`
            : customerName;
        
        customerSearch.value = displayText;
        customerIdInput.value = customerId;
        
        // Esconder resultados
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }
        
        // Focar no próximo campo
        document.getElementById('paymentMethod')?.focus();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async finalizeSale() {
        if (this.cart.length === 0) {
            alert('Adicione pelo menos um produto ao carrinho');
            return;
        }

        const customerId = document.getElementById('customerId')?.value || null;
        const paymentMethod = document.getElementById('paymentMethod')?.value;
        const observations = document.getElementById('observations')?.value || null;
        
        // Obter número de parcelas se for cartão de crédito
        let installments = null;
        if (paymentMethod === 'Cartão de Crédito') {
            const installmentsSelect = document.getElementById('installments');
            installments = installmentsSelect ? parseInt(installmentsSelect.value) : 1;
        }

        const user = JSON.parse(localStorage.getItem('user'));

        const saleData = {
            customerId: customerId ? parseInt(customerId) : null,
            sellerId: user.id,
            items: this.cart,
            discount: this.discount,
            paymentMethod: paymentMethod,
            installments: installments,
            observations: observations
        };

        try {
            const sale = await api.createSale(saleData);
            this.currentSale = sale;
            alert('Venda realizada com sucesso!');
            
            // Imprimir cupom automaticamente
            await this.printReceipt();
            
            // Reiniciar venda
            this.initSale();
        } catch (error) {
            alert('Erro ao finalizar venda: ' + error.message);
        }
    }

    async printReceipt() {
        if (!this.currentSale || this.cart.length === 0) {
            alert('Não há venda para imprimir');
            return;
        }

        try {
            const saleData = {
                ...this.currentSale,
                items: this.cart,
                total: parseFloat(document.getElementById('total')?.textContent.replace('R$ ', '').replace(',', '.') || 0),
                discount: this.discount,
                paymentMethod: document.getElementById('paymentMethod')?.value
            };

            await api.printFiscalReceipt(saleData);
            alert('Cupom fiscal impresso!');
        } catch (error) {
            alert('Erro ao imprimir cupom: ' + error.message);
        }
    }

    cancelSale() {
        if (confirm('Deseja realmente cancelar esta venda?')) {
            this.initSale();
        }
    }

    initNameSearch() {
        const productNameInput = document.getElementById('productNameInput');
        if (!productNameInput) return;

        let searchTimeout;
        productNameInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim();
            
            if (searchTerm.length < 2) {
                document.getElementById('productSearchResults').style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                await this.searchProductsByName(searchTerm);
            }, 300);
        });

        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#nameSearchContainer')) {
                document.getElementById('productSearchResults').style.display = 'none';
            }
        });
    }

    async searchProductsByName(searchTerm) {
        try {
            const response = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`);
            const products = await response.json();
            
            const resultsDiv = document.getElementById('productSearchResults');
            
            if (products.length === 0) {
                resultsDiv.innerHTML = '<div style="padding: 1rem; text-align: center; color: #718096;">Nenhum produto encontrado</div>';
                resultsDiv.style.display = 'block';
                return;
            }

            resultsDiv.innerHTML = products.slice(0, 10).map((product, index) => `
                <div onclick="pdv.selectProductFromSearch(${index})" 
                     data-product-id="${product.id}"
                     style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid #e2e8f0; transition: background 0.2s;"
                     onmouseover="this.style.background='#f7fafc'" 
                     onmouseout="this.style.background='white'">
                    <div style="font-weight: 600;">${product.name}</div>
                    <div style="font-size: 0.85rem; color: #718096;">
                        ${product.barcode ? `Código: ${product.barcode} | ` : ''}
                        R$ ${parseFloat(product.sale_price || product.price || 0).toFixed(2).replace('.', ',')}
                    </div>
                </div>
            `).join('');
            
            // Armazenar produtos para acesso posterior
            this.searchResults = products;
            
            resultsDiv.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        }
    }

    selectProductFromSearch(index) {
        if (this.searchResults && this.searchResults[index]) {
            const product = this.searchResults[index];
            this.addToCart(product);
            document.getElementById('productNameInput').value = '';
            document.getElementById('productSearchResults').style.display = 'none';
            document.getElementById('barcodeInput').focus();
        }
    }

    updateBarcodeStatus(isActive, isFromReader = false) {
        const statusIcon = document.getElementById('barcodeStatusIcon');
        const statusText = document.getElementById('barcodeStatusText');
        
        if (statusIcon && statusText) {
            if (isActive && isFromReader) {
                // Só mostrar "ativo" se realmente veio do leitor
                statusIcon.textContent = '✅';
                statusText.textContent = 'Leitor detectado';
                statusIcon.parentElement.style.color = '#10b981';
                
                // Voltar ao estado normal após 2 segundos
                setTimeout(() => {
                    this.updateBarcodeStatus(false, false);
                }, 2000);
            } else {
                // Estado padrão: aguardando
                statusIcon.textContent = '📡';
                statusText.textContent = 'Aguardando leitor';
                statusIcon.parentElement.style.color = '#718096';
            }
        }
    }
}

// Função global para alternar modo de busca
function toggleSearchMode() {
    const barcodeContainer = document.getElementById('barcodeSearchContainer');
    const nameContainer = document.getElementById('nameSearchContainer');
    const searchBtn = document.getElementById('searchModeBtn');
    
    if (barcodeContainer.style.display === 'none') {
        // Mudar para código de barras
        barcodeContainer.style.display = 'block';
        nameContainer.style.display = 'none';
        searchBtn.textContent = '🔍 Buscar por Nome';
        document.getElementById('barcodeInput').focus();
    } else {
        // Mudar para busca por nome
        barcodeContainer.style.display = 'none';
        nameContainer.style.display = 'block';
        searchBtn.textContent = '📊 Buscar por Código';
        document.getElementById('productNameInput').focus();
    }
}

// Função para buscar código manualmente
async function searchBarcodeManually() {
    const barcodeInput = document.getElementById('barcodeInput');
    const barcode = barcodeInput.value.trim();
    
    if (!barcode || barcode.length < 1) {
        alert('Digite um código de barras primeiro!');
        return;
    }
    
    if (barcode.length < 3) {
        alert('Código muito curto. Digite pelo menos 3 caracteres.');
        return;
    }
    
    if (window.pdv && window.pdv.barcodeReader) {
        // Usar o processador de código de barras existente
        await window.pdv.barcodeReader.processBarcode(barcode, false);
    } else {
        // Buscar diretamente
        try {
            const product = await api.getProductByBarcode(barcode);
            if (product && window.pdv) {
                window.pdv.addToCart(product);
                barcodeInput.value = '';
                barcodeInput.focus();
            } else {
                alert('Produto não encontrado!');
            }
        } catch (error) {
            alert('Erro ao buscar produto: ' + (error.message || 'Produto não encontrado'));
        }
    }
}

// Inicializar PDV
let pdv;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('barcodeInput')) {
        pdv = new PDV();
        window.pdv = pdv; // Tornar global para acesso de outras funções
    }
});



