// ========================================
// LEITOR DE CÓDIGO DE BARRAS
// ========================================

class BarcodeReader {
    constructor(inputElement, onBarcodeRead, options = {}) {
        this.input = inputElement;
        this.buffer = '';
        this.timeout = null;
        this.onBarcodeRead = onBarcodeRead;
        // lookupProduct: quando true, tenta buscar produto na API (modo PDV)
        // quando false, só preenche o campo com o código lido (modo cadastro)
        this.options = {
            lookupProduct: true,
            autoFocus: true, // controlar se o leitor força foco constante no input
            ...options
        };
        this.config = {
            autoDetect: true,
            readerMode: false
        };
        this.init();
    }
    
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    init() {
        // Detectar se é entrada de leitor (entrada muito rápida) ou digitação manual
        let lastKeyTime = 0;
        let keyTimes = []; // Array para armazenar tempos entre teclas
        let isBarcodeReader = false;
        let minBarcodeLength = 3; // Tamanho mínimo para considerar como código de barras
        
        // Capturar entrada do leitor
        this.input.addEventListener('keypress', (e) => {
            const currentTime = Date.now();
            
            if (lastKeyTime > 0) {
                const timeDiff = currentTime - lastKeyTime;
                keyTimes.push(timeDiff);
                
                // Manter apenas os últimos 5 tempos
                if (keyTimes.length > 5) {
                    keyTimes.shift();
                }
                
                // Se a média dos tempos for muito rápida (< 30ms), provavelmente é leitor
                if (keyTimes.length >= 3) {
                    const avgTime = keyTimes.reduce((a, b) => a + b, 0) / keyTimes.length;
                    if (avgTime < 30) {
                        isBarcodeReader = true;
                    }
                }
            }
            
            lastKeyTime = currentTime;
            
            // Limpar timeout anterior
            clearTimeout(this.timeout);
            
            // Adicionar caractere ao buffer
            this.buffer += e.key;
            
            // Sincronizar buffer com valor do input (para digitação manual)
            // O input.value já tem o caractere adicionado pelo navegador
            // Então não precisamos atualizar manualmente
            
            // Se pressionar Enter, processar código (sempre, seja leitor ou digitação)
            if (e.key === 'Enter') {
                e.preventDefault();
                // Usar valor do input em vez do buffer (mais confiável para digitação manual)
                const barcode = this.input.value.trim();
                if (barcode.length >= minBarcodeLength) {
                    this.processBarcode(barcode, isBarcodeReader);
                } else if (barcode.length > 0) {
                    // Código muito curto
                    alert('Código muito curto. Digite pelo menos 3 caracteres.');
                }
                this.buffer = '';
                isBarcodeReader = false;
                keyTimes = [];
                // No modo cadastro, mantemos o código no input
                if (this.options.lookupProduct) {
                    this.input.value = '';
                }
            } else {
                // Timeout: se não receber mais caracteres, verificar se deve processar
                this.timeout = setTimeout(() => {
                    const barcode = this.buffer.trim();
                    
                    // Processar automaticamente se:
                    // 1. Modo leitor ativo E tiver pelo menos 3 caracteres
                    // OU
                    // 2. Detecção automática ativa E detectou leitor E tiver pelo menos 4 caracteres
                    if (this.config.readerMode && barcode.length >= 3) {
                        // Modo leitor: processar qualquer entrada após timeout
                        this.processBarcode(barcode, true);
                        this.buffer = '';
                        isBarcodeReader = false;
                        keyTimes = [];
                        this.input.value = '';
                    } else if (this.config.autoDetect && isBarcodeReader && barcode.length >= 4) {
                        // Detecção automática: só processar se detectou leitor
                        this.processBarcode(barcode, true);
                        this.buffer = '';
                        isBarcodeReader = false;
                        keyTimes = [];
                        if (this.options.lookupProduct) {
                            this.input.value = '';
                        }
                    }
                    // Se não atender nenhuma condição, NÃO processar - deixar usuário terminar de digitar
                    // O usuário deve pressionar Enter ou clicar no botão Buscar
                }, this.config.readerMode ? 300 : 150);
            }
        });
        
        // Limpar buffer quando o usuário apagar (backspace) ou modificar o input
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                clearTimeout(this.timeout);
                // Sincronizar buffer com input após backspace
                setTimeout(() => {
                    this.buffer = this.input.value;
                }, 0);
                isBarcodeReader = false;
                keyTimes = [];
                lastKeyTime = 0;
            }
        });
        
        // Sincronizar buffer quando input é modificado (colar, etc)
        this.input.addEventListener('input', (e) => {
            // Se o input foi modificado externamente (não por keypress), sincronizar buffer
            if (this.input.value !== this.buffer) {
                this.buffer = this.input.value;
            }
        });

        // Comportamento agressivo de foco só quando autoFocus estiver habilitado
        if (this.options.autoFocus) {
            // Focar no input quando a página carregar
            window.addEventListener('load', () => {
                this.input.focus();
            });

            // Focar novamente após clicar, mas apenas se não foi em um campo editável
            document.addEventListener('click', (e) => {
                // Não focar se o clique foi em um input, textarea, select ou botão
                const target = e.target;
                const isEditable = target.tagName === 'INPUT' || 
                                  target.tagName === 'TEXTAREA' || 
                                  target.tagName === 'SELECT' ||
                                  target.tagName === 'BUTTON' ||
                                  target.closest('button') !== null ||
                                  target.closest('input') !== null ||
                                  target.closest('textarea') !== null ||
                                  target.closest('select') !== null ||
                                  target.closest('.modal') !== null; // Não focar se clicou em um modal
                
                // Se o clique foi no próprio input de código de barras, focar nele
                if (target === this.input) {
                    this.input.focus();
                    return;
                }
                
                // Se foi em um elemento editável ou modal, não focar
                if (isEditable) {
                    return;
                }
                
                // Caso contrário, focar no input de código de barras
                if (this.input) {
                    this.input.focus();
                }
            });
        }
    }

    async processBarcode(barcode, isFromReader = false) {
        if (!barcode || barcode.length < 1) return;

        // Modo simples: apenas usar o código lido, sem buscar produto na API
        if (!this.options.lookupProduct) {
            this.input.value = barcode;
            this.input.focus();
            if (this.onBarcodeRead) {
                // Passa o código bruto; segundo parâmetro reservado para compatibilidade
                this.onBarcodeRead(barcode, null);
            }
            return;
        }

        // Se veio do leitor, mostrar feedback visual
        if (isFromReader && window.pdv) {
            window.pdv.updateBarcodeStatus(true, true);
        }

        try {
            // Buscar produto pelo código de barras
            const product = await api.getProductByBarcode(barcode);

            if (product) {
                // Chamar callback
                if (this.onBarcodeRead) {
                    this.onBarcodeRead(product);
                }
                this.input.value = '';
                this.input.focus();
            } else {
                alert('Produto não encontrado!');
                this.input.value = '';
                this.input.focus();
            }
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            // Verificar se é erro 404 (produto não encontrado)
            if (error.message && error.message.includes('não encontrado')) {
                alert('Produto não encontrado!');
            } else {
                alert('Erro ao processar código de barras: ' + (error.message || 'Erro desconhecido'));
            }
            this.input.value = '';
            this.input.focus();
        }
    }
}



