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

    async init() {
        // Primeiro, buscar estado do servidor
        await this.loadCashControlFromServer();
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

    async loadCashControlFromServer() {
        try {
            // CORREÇÃO CRÍTICA: Obter store_id atual
            const currentStoreId = this.getCurrentStoreId();
            console.log('🏪 Store_id atual:', currentStoreId);
            
            // PRIMEIRO: Sempre verificar estado local ANTES de buscar do servidor
            const key = this.getCashControlKey();
            const localStored = localStorage.getItem(key);
            let hasValidLocalState = false;
            
            if (localStored) {
                try {
                    const localState = JSON.parse(localStored);
                    
                    // CORREÇÃO CRÍTICA: Verificar se o store_id do estado salvo corresponde ao atual
                    if (localState.store_id && localState.store_id !== currentStoreId) {
                        console.log('⚠️ Store_id do estado salvo não corresponde ao atual. Ignorando estado salvo.');
                        // Limpar estado antigo e continuar para buscar do servidor
                        localStorage.removeItem(key);
                    } else if (localState.isOpen && localState.lastOpened) {
                        // Verificar se o caixa foi aberto hoje
                        const lastOpenedDate = new Date(localState.lastOpened);
                        const today = new Date();
                        const lastOpenedDay = lastOpenedDate.toDateString();
                        const todayDay = today.toDateString();
                        
                        if (lastOpenedDay === todayDay) {
                            // Caixa está aberto hoje localmente - USAR ESTE ESTADO
                            console.log('✅ Caixa aberto hoje localmente, usando estado local');
                            this.cashControl = { ...localState, store_id: currentStoreId };
                            this.saveCashControl();
                            hasValidLocalState = true;
                            
                            // Atualizar vendas do servidor em background, mas manter isOpen = true
                            try {
                                const todaySalesData = await api.getTodaySales();
                                if (todaySalesData && todaySalesData.total !== undefined) {
                                    this.cashControl.todaySales = parseFloat(todaySalesData.total || 0);
                                    this.cashControl.currentBalance = this.cashControl.initialCash + this.cashControl.todaySales;
                                    this.saveCashControl();
                                    console.log('✅ Vendas atualizadas do servidor');
                                }
                            } catch (e) {
                                console.warn('⚠️ Erro ao atualizar vendas, mantendo valores locais:', e);
                            }
                            
                            // Tentar sincronizar com servidor, mas não sobrescrever isOpen
                            try {
                                const serverState = await api.getCashStatus();
                                if (serverState && serverState.isOpen) {
                                    // Servidor confirma que está aberto - sincronizar valores
                                    this.cashControl.initialCash = serverState.initialCash || this.cashControl.initialCash;
                                    this.cashControl.todaySales = serverState.todaySales || this.cashControl.todaySales;
                                    this.cashControl.currentBalance = serverState.currentBalance || this.cashControl.currentBalance;
                                    this.cashControl.lastOpened = serverState.openedAt || this.cashControl.lastOpened;
                                    this.cashControl.observations = serverState.observations || this.cashControl.observations;
                                    this.saveCashControl();
                                    console.log('✅ Estado sincronizado com servidor');
                                } else {
                                    console.log('⚠️ Servidor indica fechado, mas mantendo estado local (aberto hoje)');
                                }
                            } catch (e) {
                                console.warn('⚠️ Erro ao verificar servidor, mantendo estado local:', e);
                            }
                            
                            // Retornar aqui - não continuar com a lógica abaixo
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao parsear estado local:', e);
                }
            }
            
            // Se não há estado local válido, buscar do servidor
            if (!hasValidLocalState) {
                console.log('🔄 Buscando estado do caixa no servidor...');
                const serverState = await api.getCashStatus();
                console.log('Estado do servidor:', serverState);
                
                if (serverState && serverState.isOpen) {
                    // Caixa está aberto no servidor
                    this.cashControl = {
                        isOpen: true,
                        initialCash: serverState.initialCash || 0,
                        currentBalance: serverState.currentBalance || 0,
                        todaySales: serverState.todaySales || 0,
                        lastOpened: serverState.openedAt || new Date().toISOString(),
                        lastClosed: null,
                        observations: serverState.observations || '',
                        store_id: currentStoreId
                    };
                    this.saveCashControl();
                    console.log('✅ Caixa aberto no servidor, estado sincronizado para store_id:', currentStoreId);
                } else {
                    // Caixa está fechado
                    this.cashControl = {
                        isOpen: false,
                        initialCash: 0,
                        currentBalance: 0,
                        todaySales: 0,
                        lastOpened: null,
                        lastClosed: null,
                        observations: '',
                        store_id: currentStoreId
                    };
                    this.saveCashControl();
                    console.log('ℹ️ Caixa fechado para store_id:', currentStoreId);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao buscar estado do servidor, usando localStorage:', error);
            // Em caso de erro, tentar carregar do localStorage
            this.loadCashControl();
        }
    }

    // CORREÇÃO CRÍTICA: Obter store_id do usuário atual
    getCurrentStoreId() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.store_id ? parseInt(user.store_id) : null;
        } catch (error) {
            console.warn('⚠️ Erro ao obter store_id:', error);
            return null;
        }
    }

    // CORREÇÃO CRÍTICA: Obter chave do localStorage baseada no store_id
    getCashControlKey() {
        const storeId = this.getCurrentStoreId();
        if (storeId) {
            return `smartshow_cash_control_store_${storeId}`;
        }
        // Fallback para compatibilidade (usuários sem store_id)
        return 'smartshow_cash_control';
    }

    loadCashControl() {
        const key = this.getCashControlKey();
        const stored = localStorage.getItem(key);
        const currentStoreId = this.getCurrentStoreId();
        
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                
                // CORREÇÃO CRÍTICA: Verificar se o store_id do estado salvo corresponde ao atual
                if (parsed.store_id && parsed.store_id !== currentStoreId) {
                    console.log('⚠️ Store_id do estado salvo não corresponde ao atual. Ignorando estado salvo.');
                    // Resetar para estado fechado
                    this.cashControl = {
                        isOpen: false,
                        initialCash: 0,
                        currentBalance: 0,
                        todaySales: 0,
                        lastOpened: null,
                        lastClosed: null,
                        observations: '',
                        store_id: currentStoreId
                    };
                    this.saveCashControl();
                    return;
                }
                
                // Verificar se o caixa foi aberto hoje
                if (parsed.isOpen && parsed.lastOpened) {
                    const lastOpenedDate = new Date(parsed.lastOpened);
                    const today = new Date();
                    
                    // Comparar apenas a data (sem hora)
                    const lastOpenedDay = lastOpenedDate.toDateString();
                    const todayDay = today.toDateString();
                    
                    if (lastOpenedDay !== todayDay) {
                        // Caixa foi aberto em outro dia, considerar fechado
                        console.log('⚠️ Caixa foi aberto em outro dia, fechando automaticamente...');
                        this.cashControl = {
                            isOpen: false,
                            initialCash: 0,
                            currentBalance: 0,
                            todaySales: 0,
                            lastOpened: null,
                            lastClosed: parsed.lastClosed || null,
                            observations: '',
                            store_id: currentStoreId
                        };
                        this.saveCashControl();
                    } else {
                        // Caixa foi aberto hoje, manter estado
                        this.cashControl = { ...parsed, store_id: currentStoreId };
                        console.log('✅ Caixa aberto hoje, restaurando estado:', this.cashControl);
                    }
                } else {
                    // Caixa não estava aberto, usar dados salvos
                    this.cashControl = { ...parsed, store_id: currentStoreId };
                }
            } catch (error) {
                console.error('❌ Erro ao carregar estado do caixa:', error);
                // Em caso de erro, usar estado padrão
                this.cashControl = {
                    isOpen: false,
                    initialCash: 0,
                    currentBalance: 0,
                    todaySales: 0,
                    lastOpened: null,
                    lastClosed: null,
                    observations: '',
                    store_id: currentStoreId
                };
            }
        } else {
            console.log('ℹ️ Nenhum estado do caixa encontrado no localStorage para store_id:', currentStoreId);
            // Se não há estado salvo, garantir que store_id está definido
            this.cashControl.store_id = currentStoreId;
        }
    }

    saveCashControl() {
        const key = this.getCashControlKey();
        // CORREÇÃO CRÍTICA: Sempre incluir store_id ao salvar
        const currentStoreId = this.getCurrentStoreId();
        const dataToSave = {
            ...this.cashControl,
            store_id: currentStoreId
        };
        localStorage.setItem(key, JSON.stringify(dataToSave));
        console.log('💾 Estado do caixa salvo para store_id:', currentStoreId);
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
            // Forçar atualização imediata e depois periódica
            console.log('🔄 Caixa aberto, atualizando vendas...');
            this.updateCashStatus();
            
            // Garantir que a atualização periódica está rodando
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
        } else {
            if (openBtn) openBtn.style.display = 'inline-block';
            if (closeBtn) closeBtn.style.display = 'none';
            if (pdvMain) pdvMain.style.display = 'none';
            if (closedMessage) closedMessage.style.display = 'block';
            if (cashStatus) cashStatus.style.display = 'none';
            
            // Parar atualização periódica se o caixa estiver fechado
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }
    }

    async updateCashStatus() {
        // Só atualizar se o caixa estiver aberto
        if (!this.cashControl.isOpen) {
            console.log('⚠️ Caixa não está aberto, não atualizando vendas');
            return;
        }
        
        // Buscar vendas reais do banco de dados
        try {
            console.log('🔄 Atualizando vendas do caixa...');
            const todaySalesData = await api.getTodaySales();
            console.log('Dados recebidos da API:', todaySalesData);
            
            if (todaySalesData && (todaySalesData.total !== undefined || todaySalesData.total !== null)) {
                const newTotal = parseFloat(todaySalesData.total || 0);
                console.log(`Total de vendas do banco: R$ ${newTotal.toFixed(2)}`);
                
                // Atualizar valores
                const oldSales = this.cashControl.todaySales;
                this.cashControl.todaySales = newTotal;
                this.cashControl.currentBalance = this.cashControl.initialCash + this.cashControl.todaySales;
                
                // Salvar no localStorage
                this.saveCashControl();
                
                console.log(`📈 Vendas anteriores: R$ ${oldSales.toFixed(2)}`);
                console.log(`✅ Vendas atualizadas: R$ ${this.cashControl.todaySales.toFixed(2)}`);
                console.log(`✅ Saldo atual: R$ ${this.cashControl.currentBalance.toFixed(2)}`);
            } else {
                console.warn('⚠️ Resposta da API não contém total válido:', todaySalesData);
                console.warn('⚠️ Mantendo valores atuais:', {
                    todaySales: this.cashControl.todaySales,
                    currentBalance: this.cashControl.currentBalance
                });
            }
        } catch (error) {
            console.error('❌ Erro ao buscar vendas do dia:', error);
            console.error('❌ Detalhes do erro:', error.message);
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

    async openCash() {
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

        try {
            // Abrir caixa no servidor
            console.log('Abrindo caixa no servidor...');
            await api.openCash(initialCash, observations);
            
            // Atualizar estado local
            const now = new Date();
            const currentStoreId = this.getCurrentStoreId();
            this.cashControl = {
                isOpen: true,
                initialCash: initialCash,
                currentBalance: initialCash,
                todaySales: 0,
                lastOpened: now.toISOString(),
                lastClosed: null,
                observations: observations,
                store_id: currentStoreId
            };

            console.log('✅ Caixa aberto para store_id:', currentStoreId, this.cashControl);
            this.saveCashControl();
            this.hideOpenCashModal();
            
            // Atualizar vendas imediatamente ao abrir
            await this.updateCashStatus();
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
        } catch (error) {
            console.error('❌ Erro ao abrir caixa:', error);
            const errorMessage = error.message || 'Erro desconhecido';
            // Se a mensagem for genérica, tentar obter mais detalhes
            if (errorMessage === 'Erro ao abrir caixa' || errorMessage === 'Erro na requisição') {
                alert('Erro ao abrir caixa. Verifique:\n- Se você está logado\n- Se o servidor está respondendo\n- Console do navegador para mais detalhes');
            } else {
                alert('Erro ao abrir caixa: ' + errorMessage);
            }
        }
    }

    async closeCash() {
        if (!confirm('Tem certeza que deseja fechar o caixa?')) {
            return;
        }

        const finalCash = parseFloat(document.getElementById('finalCashValue').value);
        const observations = document.getElementById('closeObservations').value || '';

        if (isNaN(finalCash) || finalCash < 0) {
            alert('Por favor, informe um valor válido para o fechamento!');
            return;
        }

        try {
            // Fechar caixa no servidor
            console.log('🔒 Fechando caixa no servidor...');
            const result = await api.closeCash(finalCash, observations);
            console.log('✅ Caixa fechado no servidor:', result);
            
            // Calcular diferença
            const difference = result.difference || (finalCash - this.cashControl.currentBalance);
            const differenceText = difference >= 0 
                ? `Sobra: ${this.formatCurrency(difference)}`
                : `Falta: ${this.formatCurrency(Math.abs(difference))}`;

            // Salvar relatório
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
            
            // Fechar caixa localmente
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
        } catch (error) {
            console.error('❌ Erro ao fechar caixa:', error);
            alert('Erro ao fechar caixa: ' + (error.message || 'Erro desconhecido'));
        }
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
    
    // Tornar caixaSystem acessível globalmente para o botão de atualizar
    window.caixaSystem = caixaSystem;
    
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






