// ========================================
// DASHBOARD
// ========================================

let salesChart = null;
let paymentChart = null;
let stores = [];
let selectedStoreId = '';
let compareStoreIds = [];

async function loadStores() {
    try {
        stores = await api.getStores();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Mostrar seletor apenas para admin/gerente
        const container = document.getElementById('storeSelectorContainer');
        const selector = document.getElementById('storeSelector');
        
        if ((user.role === 'admin' || user.role === 'gerente') && container && selector) {
            container.style.display = 'block';
            
            // Limpar opções existentes (exceto "Todas as Lojas")
            while (selector.options.length > 1) {
                selector.remove(1);
            }
            
            // Adicionar lojas com ícone
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = `🏪 ${store.name}`;
                selector.appendChild(option);
            });
            
            // Restaurar seleção salva
            const savedStoreId = localStorage.getItem('dashboard_selected_store');
            if (savedStoreId) {
                selector.value = savedStoreId;
                selectedStoreId = savedStoreId;
            }
        } else if (container) {
            container.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao carregar lojas:', error);
    }
}

async function loadDashboard() {
    try {
        const data = await api.getDashboard(
            selectedStoreId || null,
            compareStoreIds.length > 0 ? compareStoreIds : null
        );

        // Atualizar cards de vendas
        document.getElementById('todaySales').textContent = 
            `R$ ${data.sales.today.total.toFixed(2).replace('.', ',')}`;
        document.getElementById('todaySalesCount').textContent = 
            `${data.sales.today.count} vendas`;

        document.getElementById('monthSales').textContent = 
            `R$ ${data.sales.month.total.toFixed(2).replace('.', ',')}`;
        document.getElementById('monthSalesCount').textContent = 
            `${data.sales.month.count} vendas`;

        // Atualizar card de estoque baixo
        document.getElementById('lowStock').textContent = data.stock.lowStock;

        // Atualizar cards financeiros
        document.getElementById('receivable').textContent = 
            `R$ ${data.financial.receivable.total.toFixed(2).replace('.', ',')}`;
        document.getElementById('receivableCount').textContent = 
            `${data.financial.receivable.count} contas`;

        document.getElementById('payable').textContent = 
            `R$ ${data.financial.payable.total.toFixed(2).replace('.', ',')}`;
        document.getElementById('payableCount').textContent = 
            `${data.financial.payable.count} contas`;

        // Atualizar cards de OS por status
        document.getElementById('osPronta').textContent = data.serviceOrders.pronta || 0;
        document.getElementById('osAguardandoAutorizacao').textContent = data.serviceOrders.aguardando_autorizacao || 0;
        document.getElementById('osSemConcerto').textContent = data.serviceOrders.sem_concerto || 0;
        document.getElementById('osEntregue').textContent = data.serviceOrders.entregue || 0;
        document.getElementById('osEmManutencao').textContent = data.serviceOrders.em_manutencao || 0;
        document.getElementById('osAguardandoPeca').textContent = data.serviceOrders.aguardando_peca || 0;

        // Carregar gráficos
        loadCharts(data.sales);

        // Carregar produtos com estoque baixo
        loadLowStockProducts(data.stock.products || []);

        // Carregar vendas recentes
        await loadRecentSales();
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function loadCharts(salesData) {
    // Gráfico de vendas dos últimos 7 dias
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        if (salesChart) {
            salesChart.destroy();
        }

        const labels = salesData.byDay?.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }) || [];
        const totals = salesData.byDay?.map(item => parseFloat(item.total)) || [];
        const counts = salesData.byDay?.map(item => parseInt(item.count)) || [];

        salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Valor (R$)',
                        data: totals,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'Quantidade',
                        data: counts,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Valor: R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`;
                                } else {
                                    return `Quantidade: ${context.parsed.y}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Valor (R$)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(0);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Quantidade'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    // Gráfico de vendas por forma de pagamento
    const paymentCtx = document.getElementById('paymentChart');
    if (paymentCtx) {
        if (paymentChart) {
            paymentChart.destroy();
        }

        const paymentLabels = salesData.byPayment?.map(item => {
            const methods = {
                'cash': 'Dinheiro',
                'credit': 'Crédito',
                'debit': 'Débito',
                'pix': 'PIX',
                'ticket': 'Boleto'
            };
            return methods[item.payment_method] || item.payment_method;
        }) || [];
        const paymentTotals = salesData.byPayment?.map(item => parseFloat(item.total)) || [];

        paymentChart = new Chart(paymentCtx, {
            type: 'doughnut',
            data: {
                labels: paymentLabels,
                datasets: [{
                    label: 'Valor (R$)',
                    data: paymentTotals,
                    backgroundColor: [
                        '#fbbf24',
                        '#3b82f6',
                        '#10b981',
                        '#8b5cf6',
                        '#f97316',
                        '#ef4444'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: R$ ${value.toFixed(2).replace('.', ',')} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

function loadLowStockProducts(products) {
    const tbody = document.getElementById('lowStockProductsBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Nenhum produto com estoque baixo</td></tr>';
    } else {
        tbody.innerHTML = products.map(product => {
            const stockClass = product.stock === 0 ? 'style="color: #ef4444; font-weight: bold;"' : 
                             product.stock <= product.min_stock ? 'style="color: #f59e0b; font-weight: bold;"' : '';
            
            return `
                <tr>
                    <td>${product.name || '-'}</td>
                    <td>${product.barcode || '-'}</td>
                    <td ${stockClass}>${product.stock}</td>
                    <td>${product.min_stock || 0}</td>
                    <td>R$ ${parseFloat(product.sale_price || 0).toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        }).join('');
    }
}

async function loadRecentSales() {
    try {
        // Usar data atual no timezone do Brasil (UTC-3)
        const now = new Date();
        const brazilOffset = -3 * 60; // UTC-3 em minutos
        const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60 * 1000);
        const today = brazilTime.toISOString().split('T')[0];
        const sales = await api.getSales(today, today);

        const tbody = document.getElementById('recentSalesBody');
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhuma venda hoje</td></tr>';
        } else {
            tbody.innerHTML = sales.slice(0, 10).map(sale => {
                // Corrigir timezone para Brasil (UTC-3)
                const saleDate = new Date(sale.created_at);
                const brazilDate = new Date(saleDate.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
                const formattedDate = brazilDate.toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // Mapear forma de pagamento
                const paymentMethods = {
                    'cash': 'Dinheiro',
                    'credit': 'Crédito',
                    'debit': 'Débito',
                    'pix': 'PIX',
                    'ticket': 'Boleto'
                };
                const paymentMethod = paymentMethods[sale.payment_method] || sale.payment_method || '-';
                
                return `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${sale.sale_number}</td>
                    <td>${sale.customer_name || 'Cliente não informado'}</td>
                    <td>${sale.seller_name || 'Não informado'}</td>
                    <td>${paymentMethod}</td>
                    <td>R$ ${sale.total.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
            }).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar vendas recentes:', error);
    }
}

function openCompareModal() {
    const modal = document.getElementById('compareModal');
    const checkboxes = document.getElementById('compareStoresCheckboxes');
    
    if (!modal || !checkboxes) return;
    
    // Limpar checkboxes
    checkboxes.innerHTML = '';
    
    // Criar checkbox para cada loja com design moderno
    stores.forEach(store => {
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; cursor: pointer; padding: 1rem; background: white; border: 2px solid #e2e8f0; border-radius: 12px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);';
        label.onmouseover = function() {
            this.style.borderColor = '#FFD700';
            this.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.2)';
            this.style.transform = 'translateY(-2px)';
        };
        label.onmouseout = function() {
            if (!label.querySelector('input').checked) {
                this.style.borderColor = '#e2e8f0';
                this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                this.style.transform = 'translateY(0)';
            }
        };
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = store.id;
        checkbox.checked = compareStoreIds.includes(store.id);
        checkbox.style.cssText = 'width: 20px; height: 20px; cursor: pointer; accent-color: #FFD700;';
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                label.style.borderColor = '#FFD700';
                label.style.background = '#fffef5';
                label.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.2)';
            } else {
                label.style.borderColor = '#e2e8f0';
                label.style.background = 'white';
                label.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }
        });
        
        // Aplicar estilo inicial se já estiver selecionado
        if (checkbox.checked) {
            label.style.borderColor = '#FFD700';
            label.style.background = '#fffef5';
            label.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.2)';
        }
        
        const icon = document.createElement('span');
        icon.textContent = '🏪';
        icon.style.fontSize = '1.2rem';
        
        const span = document.createElement('span');
        span.textContent = store.name;
        span.style.fontWeight = '600';
        span.style.color = '#2d3748';
        
        label.appendChild(checkbox);
        label.appendChild(icon);
        label.appendChild(span);
        checkboxes.appendChild(label);
    });
    
    modal.style.display = 'block';
}

function closeCompareModal() {
    const modal = document.getElementById('compareModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function applyComparison() {
    const checkboxes = document.querySelectorAll('#compareStoresCheckboxes input[type="checkbox"]:checked');
    compareStoreIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    selectedStoreId = '';
    
    // Atualizar seletor
    const selector = document.getElementById('storeSelector');
    if (selector) {
        selector.value = '';
    }
    
    // Atualizar botão de comparar
    const compareBtn = document.getElementById('compareStoresBtn');
    if (compareBtn) {
        if (compareStoreIds.length > 0) {
            compareBtn.innerHTML = `🔀 Comparando ${compareStoreIds.length} loja(s)`;
            compareBtn.style.display = 'inline-block';
        } else {
            compareBtn.style.display = 'none';
        }
    }
    
    closeCompareModal();
    loadDashboard();
}

// Carregar dashboard ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('todaySales')) {
        // Carregar lojas primeiro
        await loadStores();
        
        // Event listeners
        const selector = document.getElementById('storeSelector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                selectedStoreId = e.target.value;
                compareStoreIds = [];
                localStorage.setItem('dashboard_selected_store', selectedStoreId);
                
                // Atualizar botão de comparar
                const compareBtn = document.getElementById('compareStoresBtn');
                if (compareBtn) {
                    compareBtn.style.display = 'none';
                }
                
                loadDashboard();
            });
        }
        
        const compareBtn = document.getElementById('compareStoresBtn');
        if (compareBtn) {
            compareBtn.addEventListener('click', openCompareModal);
        }
        
        // Fechar modal ao clicar fora
        window.onclick = function(event) {
            const modal = document.getElementById('compareModal');
            if (event.target === modal) {
                closeCompareModal();
            }
        }
        
        loadDashboard();
        // Atualizar a cada 30 segundos
        setInterval(loadDashboard, 30000);
    }
});
