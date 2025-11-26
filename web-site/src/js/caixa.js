// ========================================
// SISTEMA DE CAIXA - ABERTURA E FECHAMENTO
// ========================================

class CaixaSystem {
    constructor() {
        this.cashControl = {
            isOpen: false,
            initialCash: 0,
            currentBalance: 0,
            todaySales: 0,
            lastOpened: null,
            lastClosed: null,
            observations: ''
        };
        this.init();
    }

    init() {
        this.loadCashControl();
        this.setupEventListeners();
        this.updateUI();
        
        // Atualizar vendas do dia periodicamente se o caixa estiver aberto
        if (this.cashControl.isOpen) {
            // Atualizar imediatamente
            this.updateCashStatus();
            // Atualizar a cada 10 segundos
            this.updateInterval = setInterval(() => {
                if (this.cashControl.isOpen) {
                    this.updateCashStatus();
                } else {
                    clearInterval(this.updateInterval);
                }
            }, 10000);
        }
    }

    loadCashControl() {
        const stored = localStorage.getItem('smartshow_cash_control');
        if (stored) {
            this.cashControl = JSON.parse(stored);
        }
    }

    saveCashControl() {
        localStorage.setItem('smartshow_cash_control', JSON.stringify(this.cashControl));
    }

    setupEventListeners() {
        // Botão abrir caixa
        document.getElementById('openCashBtn')?.addEventListener('click', () => {
            this.showOpenCashModal();
        });

        document.getElementById('openCashModalBtn')?.addEventListener('click', () => {
            this.showOpenCashModal();
        });

        // Botão fechar caixa
        document.getElementById('closeCashBtn')?.addEventListener('click', () => {
            this.showCloseCashModal();
        });

        // Formulário de abertura
        document.getElementById('openCashForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.openCash();
        });

        // Botão confirmar fechamento
        document.getElementById('confirmCloseCash')?.addEventListener('click', () => {
            this.closeCash();
        });

        // Fechar modais
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.hideOpenCashModal();
        });

        document.getElementById('closeCloseModal')?.addEventListener('click', () => {
            this.hideCloseCashModal();
        });

        document.getElementById('cancelOpenCash')?.addEventListener('click', () => {
            this.hideOpenCashModal();
        });

        document.getElementById('cancelCloseCash')?.addEventListener('click', () => {
            this.hideCloseCashModal();
        });

        // Calcular diferença no fechamento
        document.getElementById('finalCashValue')?.addEventListener('input', () => {
            this.calculateCashDifference();
        });
    }

    updateUI() {
        const isOpen = this.cashControl.isOpen;
        
        // Mostrar/esconder botões
        const openBtn = document.getElementById('openCashBtn');
        const closeBtn = document.getElementById('closeCashBtn');
        const pdvMain = document.getElementById('pdvMain');
        const closedMessage = document.getElementById('closedCashMessage');
        const cashStatus = document.getElementById('cashStatus');

        if (isOpen) {
            if (openBtn) openBtn.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'inline-block';
            if (pdvMain) pdvMain.style.display = 'block';
            if (closedMessage) closedMessage.style.display = 'none';
            if (cashStatus) cashStatus.style.display = 'block';
            
            // Atualizar informações do caixa (buscar do banco)
            this.updateCashStatus();
        } else {
            if (openBtn) openBtn.style.display = 'inline-block';
            if (closeBtn) closeBtn.style.display = 'none';
            if (pdvMain) pdvMain.style.display = 'none';
            if (closedMessage) closedMessage.style.display = 'block';
            if (cashStatus) cashStatus.style.display = 'none';
        }
    }

    async updateCashStatus() {
        // Buscar vendas reais do banco de dados
        try {
            console.log('🔄 Atualizando vendas do caixa...');
            const todaySalesData = await api.getTodaySales();
            console.log('📊 Dados recebidos:', todaySalesData);
            
            if (todaySalesData && todaySalesData.total !== undefined) {
                const newTotal = parseFloat(todaySalesData.total || 0);
                console.log(`💰 Total de vendas: R$ ${newTotal.toFixed(2)}`);
                
                this.cashControl.todaySales = newTotal;
                this.cashControl.currentBalance = this.cashControl.initialCash + this.cashControl.todaySales;
                this.saveCashControl();
                
                console.log(`✅ Vendas atualizadas: R$ ${this.cashControl.todaySales.toFixed(2)}`);
                console.log(`✅ Saldo atual: R$ ${this.cashControl.currentBalance.toFixed(2)}`);
            } else {
                console.warn('⚠️ Resposta da API não contém total:', todaySalesData);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar vendas do dia:', error);
            // Em caso de erro, manter valores atuais
        }
        
        // Atualizar interface sempre, mesmo se houver erro
        const initialCashEl = document.getElementById('initialCash');
        const todaySalesEl = document.getElementById('todaySales');
        const currentBalanceEl = document.getElementById('currentBalance');
        
        if (initialCashEl) {
            initialCashEl.textContent = this.formatCurrency(this.cashControl.initialCash);
        }
        if (todaySalesEl) {
            todaySalesEl.textContent = this.formatCurrency(this.cashControl.todaySales);
            console.log(`🖥️ Interface atualizada - Vendas do Dia: ${todaySalesEl.textContent}`);
        }
        if (currentBalanceEl) {
            currentBalanceEl.textContent = this.formatCurrency(this.cashControl.currentBalance);
            console.log(`🖥️ Interface atualizada - Saldo Atual: ${currentBalanceEl.textContent}`);
        }
    }

    showOpenCashModal() {
        const modal = document.getElementById('openCashModal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('initialCashValue').focus();
        }
    }

    hideOpenCashModal() {
        const modal = document.getElementById('openCashModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('openCashForm').reset();
        }
    }

    showCloseCashModal() {
        const modal = document.getElementById('closeCashModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Atualizar valores no modal (buscar vendas reais antes)
            this.updateCashStatus().then(() => {
                document.getElementById('summaryInitialCash').textContent = 
                    this.formatCurrency(this.cashControl.initialCash);
                document.getElementById('summaryTodaySales').textContent = 
                    this.formatCurrency(this.cashControl.todaySales);
                document.getElementById('summaryExpectedBalance').textContent = 
                    this.formatCurrency(this.cashControl.currentBalance);
            });
            
            document.getElementById('finalCashValue').value = '';
            document.getElementById('finalCashValue').focus();
            this.calculateCashDifference();
        }
    }

    hideCloseCashModal() {
        const modal = document.getElementById('closeCashModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('finalCashValue').value = '';
            document.getElementById('closeObservations').value = '';
        }
    }

    openCash() {
        const initialCash = parseFloat(document.getElementById('initialCashValue').value) || 0;
        const observations = document.getElementById('cashObservations').value || '';

        if (initialCash < 0) {
            alert('Valor inicial não pode ser negativo!');
            return;
        }

        if (initialCash === 0 && !confirm('Valor inicial é R$ 0,00. Deseja continuar?')) {
            return;
        }

        if (this.cashControl.isOpen) {
            alert('Caixa já está aberto!');
            return;
        }

        // Abrir caixa
        this.cashControl = {
            isOpen: true,
            initialCash: initialCash,
            currentBalance: initialCash,
            todaySales: 0,
            lastOpened: new Date().toISOString(),
            lastClosed: null,
            observations: observations
        };

        this.saveCashControl();
        this.hideOpenCashModal();
        this.updateUI();
        
        // Iniciar atualização periódica
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => {
            if (this.cashControl.isOpen) {
                this.updateCashStatus();
            } else {
                clearInterval(this.updateInterval);
            }
        }, 10000);
        
        alert('Caixa aberto com sucesso!');
    }

    closeCash() {
        if (!confirm('Tem certeza que deseja fechar o caixa?')) {
            return;
        }

        const finalCash = parseFloat(document.getElementById('finalCashValue').value);
        const observations = document.getElementById('closeObservations').value || '';

        if (isNaN(finalCash) || finalCash < 0) {
            alert('Por favor, informe um valor válido para o fechamento!');
            return;
        }

        // Calcular diferença
        const difference = finalCash - this.cashControl.currentBalance;
        const differenceText = difference >= 0 
            ? `Sobra: ${this.formatCurrency(difference)}`
            : `Falta: ${this.formatCurrency(Math.abs(difference))}`;

        // Salvar relatório (aqui você pode enviar para a API)
        const report = {
            date: new Date().toISOString(),
            initialCash: this.cashControl.initialCash,
            finalCash: finalCash,
            expectedBalance: this.cashControl.currentBalance,
            difference: difference,
            todaySales: this.cashControl.todaySales,
            observations: observations
        };

        console.log('Relatório de fechamento:', report);

        // Parar atualização periódica
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Fechar caixa
        this.cashControl.isOpen = false;
        this.cashControl.lastClosed = new Date().toISOString();
        this.cashControl.initialCash = 0;
        this.cashControl.currentBalance = 0;
        this.cashControl.todaySales = 0;
        this.cashControl.observations = '';

        this.saveCashControl();
        this.hideCloseCashModal();
        this.updateUI();

        alert(`Caixa fechado com sucesso!\n${differenceText}`);
    }

    calculateCashDifference() {
        const finalCash = parseFloat(document.getElementById('finalCashValue').value) || 0;
        const expected = this.cashControl.currentBalance;
        const difference = finalCash - expected;
        const differenceDiv = document.getElementById('cashDifference');

        if (differenceDiv) {
            if (difference > 0) {
                differenceDiv.innerHTML = `<div style="color: green; font-weight: bold;">Sobra: ${this.formatCurrency(difference)}</div>`;
            } else if (difference < 0) {
                differenceDiv.innerHTML = `<div style="color: red; font-weight: bold;">Falta: ${this.formatCurrency(Math.abs(difference))}</div>`;
            } else {
                differenceDiv.innerHTML = `<div style="color: blue; font-weight: bold;">Valor exato!</div>`;
            }
        }
    }

    addSale(amount) {
        // Não precisa mais somar manualmente - o updateCashStatus busca do banco
        // Apenas atualizar a interface
        if (this.cashControl.isOpen) {
            this.updateCashStatus();
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
}

// Inicializar sistema de caixa
let caixaSystem;

document.addEventListener('DOMContentLoaded', function() {
    caixaSystem = new CaixaSystem();
    
    // Integrar com PDV para atualizar vendas
    // Aguardar o PDV ser inicializado
    setTimeout(() => {
        if (window.pdv) {
            console.log('✅ PDV encontrado, integrando com caixa...');
            const originalFinalize = window.pdv.finalizeSale;
            if (originalFinalize) {
                window.pdv.finalizeSale = async function() {
                    console.log('🛒 Venda finalizada, atualizando caixa...');
                    const result = await originalFinalize.apply(this, arguments);
                    // Aguardar um pouco para garantir que a venda foi salva no banco
                    if (caixaSystem && caixaSystem.cashControl.isOpen) {
                        console.log('⏳ Aguardando 2 segundos antes de atualizar caixa...');
                        setTimeout(() => {
                            console.log('🔄 Atualizando caixa após venda...');
                            caixaSystem.updateCashStatus();
                        }, 2000);
                    } else {
                        console.warn('⚠️ Caixa não está aberto, não será atualizado');
                    }
                    return result;
                };
            } else {
                console.warn('⚠️ Método finalizeSale não encontrado no PDV');
            }
        } else {
            console.warn('⚠️ PDV não encontrado, tentando novamente em 1 segundo...');
            // Tentar novamente após 1 segundo
            setTimeout(() => {
                if (window.pdv) {
                    const originalFinalize = window.pdv.finalizeSale;
                    if (originalFinalize) {
                        window.pdv.finalizeSale = async function() {
                            console.log('🛒 Venda finalizada, atualizando caixa...');
                            const result = await originalFinalize.apply(this, arguments);
                            if (caixaSystem && caixaSystem.cashControl.isOpen) {
                                setTimeout(() => {
                                    caixaSystem.updateCashStatus();
                                }, 2000);
                            }
                            return result;
                        };
                    }
                }
            }, 1000);
        }
    }, 100);
    
    // Atualizar ao focar na janela (quando voltar para a aba)
    window.addEventListener('focus', () => {
        if (caixaSystem && caixaSystem.cashControl.isOpen) {
            console.log('🔄 Janela focada, atualizando caixa...');
            caixaSystem.updateCashStatus();
        }
    });
});






