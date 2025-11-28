// ========================================
// CONFIGURAÇÕES DO SISTEMA
// ========================================

// Configuração do Leitor de Código de Barras
let barcodeConfig = {
    autoDetect: true,
    readerMode: false
};

// Configuração das Impressoras
let printerConfig = {
    fiscal: {
        type: 'none',
        path: '',
        autoPrint: false
    },
    a4: {
        type: 'none',
        path: ''
    }
};

// Carregar configurações salvas
function loadConfigurations() {
    // Carregar configuração do leitor
    const savedBarcode = localStorage.getItem('smartshow_reader_config');
    if (savedBarcode) {
        barcodeConfig = JSON.parse(savedBarcode);
        document.getElementById('enableAutoDetect').checked = barcodeConfig.autoDetect;
        document.getElementById('enableReaderMode').checked = barcodeConfig.readerMode;
    }

    // Carregar configuração das impressoras
    const savedPrinters = localStorage.getItem('smartshow_printer_config');
    if (savedPrinters) {
        printerConfig = JSON.parse(savedPrinters);
        document.getElementById('fiscalPrinterType').value = printerConfig.fiscal.type;
        document.getElementById('fiscalPrinterPath').value = printerConfig.fiscal.path;
        document.getElementById('autoPrintFiscal').checked = printerConfig.fiscal.autoPrint;
        document.getElementById('a4PrinterType').value = printerConfig.a4.type;
        document.getElementById('a4PrinterPath').value = printerConfig.a4.path;
        
        // Mostrar/esconder campos de configuração
        toggleFiscalPrinterConfig();
        toggleA4PrinterConfig();
    }

    // Verificar se é admin para mostrar gerenciamento de lojas e usuários
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        document.getElementById('storesManagementCard').style.display = 'block';
        document.getElementById('usersManagementCard').style.display = 'block';
        document.getElementById('dataManagementCard').style.display = 'block';
        loadStores();
        loadUsers();
        loadStoresForExport();
    }
}

// Salvar configuração do leitor
function saveBarcodeConfig() {
    barcodeConfig.autoDetect = document.getElementById('enableAutoDetect').checked;
    barcodeConfig.readerMode = document.getElementById('enableReaderMode').checked;
    
    localStorage.setItem('smartshow_reader_config', JSON.stringify(barcodeConfig));
    
    // Aplicar no leitor se existir
    if (window.pdv && window.pdv.barcodeReader) {
        window.pdv.barcodeReader.setConfig(barcodeConfig);
    }
    
    alert('Configuração do leitor salva com sucesso!');
}

// Salvar configuração da impressora fiscal
function saveFiscalPrinterConfig() {
    printerConfig.fiscal.type = document.getElementById('fiscalPrinterType').value;
    printerConfig.fiscal.path = document.getElementById('fiscalPrinterPath').value;
    printerConfig.fiscal.autoPrint = document.getElementById('autoPrintFiscal').checked;
    
    localStorage.setItem('smartshow_printer_config', JSON.stringify(printerConfig));
    alert('Configuração da impressora fiscal salva com sucesso!');
}

// Salvar configuração da impressora A4
function saveA4PrinterConfig() {
    printerConfig.a4.type = document.getElementById('a4PrinterType').value;
    printerConfig.a4.path = document.getElementById('a4PrinterPath').value;
    
    localStorage.setItem('smartshow_printer_config', JSON.stringify(printerConfig));
    alert('Configuração da impressora A4 salva com sucesso!');
}

// Testar impressora fiscal
async function testFiscalPrinter() {
    alert('Funcionalidade de teste de impressora fiscal será implementada em breve.');
}

// Testar impressora A4
async function testA4Printer() {
    alert('Funcionalidade de teste de impressora A4 será implementada em breve.');
}

// Toggle campos de configuração fiscal
function toggleFiscalPrinterConfig() {
    const type = document.getElementById('fiscalPrinterType').value;
    const configDiv = document.getElementById('fiscalPrinterConfig');
    if (type !== 'none') {
        configDiv.style.display = 'block';
    } else {
        configDiv.style.display = 'none';
    }
}

// Toggle campos de configuração A4
function toggleA4PrinterConfig() {
    const type = document.getElementById('a4PrinterType').value;
    const configDiv = document.getElementById('a4PrinterConfig');
    if (type !== 'none' && type !== 'pdf') {
        configDiv.style.display = 'block';
    } else {
        configDiv.style.display = 'none';
    }
}

// Carregar usuários (apenas admin)
async function loadUsers() {
    try {
        const users = await api.getUsers();
        const tbody = document.getElementById('usersTableBody');
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Nenhum usuário encontrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${getRoleName(user.role)}</td>
                <td>${user.store_name || '-'}</td>
                <td>${user.is_active ? '<span style="color: green;">Ativo</span>' : '<span style="color: red;">Inativo</span>'}</td>
                <td>
                    <button onclick="editUser(${user.id})" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; margin-right: 0.25rem;">Editar</button>
                    <button onclick="deleteUser(${user.id})" class="btn btn-danger" style="padding: 0.25rem 0.5rem;">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="7" style="color: red;">Erro ao carregar usuários</td></tr>';
    }
}

// Obter nome da função
function getRoleName(role) {
    const roles = {
        'admin': 'Administrador',
        'gerente': 'Gerente',
        'caixa': 'Caixa',
        'vendedor': 'Vendedor',
        'tecnico': 'Técnico'
    };
    return roles[role] || role;
}

// Abrir modal de usuário
async function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    
    // Carregar lojas no select
    await loadStoresForUserSelect();
    
    if (userId) {
        // Editar usuário existente
        title.textContent = 'Editar Usuário';
        // Carregar dados do usuário
        loadUserData(userId);
    } else {
        // Novo usuário
        title.textContent = 'Novo Usuário';
        form.reset();
        document.getElementById('userId').value = '';
        document.getElementById('userPasswordInput').required = true;
    }
    
    modal.style.display = 'block';
}

// Carregar dados do usuário para edição
async function loadUserData(userId) {
    try {
        const user = await api.getUser(userId);
        document.getElementById('userId').value = user.id;
        document.getElementById('userNameInput').value = user.name;
        document.getElementById('userUsernameInput').value = user.username;
        document.getElementById('userRoleInput').value = user.role;
        document.getElementById('userIsActive').checked = user.is_active;
        document.getElementById('userPasswordInput').required = false;
        document.getElementById('userPasswordInput').placeholder = 'Deixe em branco para manter a senha atual';
        
        // Carregar lojas e selecionar a loja do usuário
        await loadStoresForUserSelect();
        const storeSelect = document.getElementById('userStoreInput');
        if (storeSelect) {
            storeSelect.value = user.store_id || '';
            console.log('✅ Loja selecionada no formulário:', user.store_id, 'Nome:', user.store_name);
        }
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        alert('Erro ao carregar dados do usuário');
    }
}

// Fechar modal de usuário
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

// Salvar usuário
document.getElementById('userForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const storeIdInput = document.getElementById('userStoreInput');
    const storeId = storeIdInput ? storeIdInput.value : '';
    
    console.log('💾 Salvando usuário. Store ID selecionado:', storeId);
    
    const userData = {
        name: document.getElementById('userNameInput').value,
        username: document.getElementById('userUsernameInput').value,
        role: document.getElementById('userRoleInput').value,
        is_active: document.getElementById('userIsActive').checked,
        store_id: storeId && storeId !== '' ? parseInt(storeId) : null
    };
    
    console.log('💾 Dados do usuário a serem salvos:', userData);
    
    const password = document.getElementById('userPasswordInput').value;
    if (password) {
        userData.password = password;
    }
    
    try {
        if (userId) {
            await api.updateUser(userId, userData);
            alert('Usuário atualizado com sucesso!');
        } else {
            await api.createUser(userData);
            alert('Usuário criado com sucesso!');
        }
        
        closeUserModal();
        loadUsers();
    } catch (error) {
        alert('Erro ao salvar usuário: ' + (error.message || 'Erro desconhecido'));
    }
});

// Editar usuário
async function editUser(userId) {
    openUserModal(userId);
}

// Excluir usuário
async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }
    
    try {
        await api.deleteUser(userId);
        alert('Usuário excluído com sucesso!');
        loadUsers();
    } catch (error) {
        alert('Erro ao excluir usuário: ' + (error.message || 'Erro desconhecido'));
    }
}

// Configurar teste do leitor
document.getElementById('testBarcodeInput')?.addEventListener('input', function(e) {
    const value = e.target.value;
    if (value.length > 0) {
        const resultDiv = document.getElementById('testResult');
        resultDiv.style.display = 'block';
        resultDiv.style.background = '#d4edda';
        resultDiv.style.border = '1px solid #c3e6cb';
        resultDiv.style.color = '#155724';
        resultDiv.innerHTML = `
            <strong>✅ Leitor Funcionando!</strong><br>
            Código detectado: <strong>${value}</strong><br>
            <small>O leitor está enviando dados corretamente.</small>
        `;
    }
});

// Event listeners
document.getElementById('fiscalPrinterType')?.addEventListener('change', toggleFiscalPrinterConfig);
document.getElementById('a4PrinterType')?.addEventListener('change', toggleA4PrinterConfig);

// ========================================
// GERENCIAMENTO DE LOJAS/FILIAIS
// ========================================

// Carregar lojas
async function loadStores() {
    try {
        const stores = await api.getStores();
        const tbody = document.getElementById('storesTableBody');
        
        if (stores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Nenhuma loja cadastrada</td></tr>';
            return;
        }
        
        tbody.innerHTML = stores.map(store => `
            <tr>
                <td>${store.id}</td>
                <td>${store.name}</td>
                <td>${store.address || '-'}</td>
                <td>${store.city || '-'}${store.state ? `/${store.state}` : ''}</td>
                <td>${store.phone || '-'}</td>
                <td>
                    <span class="badge ${store.is_active ? 'badge-success' : 'badge-danger'}">
                        ${store.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editStore(${store.id})">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStore(${store.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar lojas:', error);
        document.getElementById('storesTableBody').innerHTML = '<tr><td colspan="7">Erro ao carregar lojas</td></tr>';
    }
}

// Abrir modal de loja
async function openStoreModal(storeId = null) {
    const modal = document.getElementById('storeModal');
    const title = document.getElementById('storeModalTitle');
    const form = document.getElementById('storeForm');
    
    form.reset();
    document.getElementById('storeId').value = '';
    
    if (storeId) {
        title.textContent = 'Editar Loja/Filial';
        try {
            const store = await api.getStore(storeId);
            document.getElementById('storeId').value = store.id;
            document.getElementById('storeNameInput').value = store.name || '';
            document.getElementById('storeAddressInput').value = store.address || '';
            document.getElementById('storeCityInput').value = store.city || '';
            document.getElementById('storeStateInput').value = store.state || '';
            document.getElementById('storePhoneInput').value = store.phone || '';
            document.getElementById('storeEmailInput').value = store.email || '';
            document.getElementById('storeIsActive').checked = store.is_active !== 0;
        } catch (error) {
            alert('Erro ao carregar dados da loja');
            return;
        }
    } else {
        title.textContent = 'Nova Loja/Filial';
    }
    
    modal.style.display = 'block';
}

// Fechar modal de loja
function closeStoreModal() {
    document.getElementById('storeModal').style.display = 'none';
    document.getElementById('storeForm').reset();
}

// Salvar loja
document.getElementById('storeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const storeId = document.getElementById('storeId').value;
    const storeData = {
        name: document.getElementById('storeNameInput').value,
        address: document.getElementById('storeAddressInput').value,
        city: document.getElementById('storeCityInput').value,
        state: document.getElementById('storeStateInput').value,
        phone: document.getElementById('storePhoneInput').value,
        email: document.getElementById('storeEmailInput').value,
        is_active: document.getElementById('storeIsActive').checked
    };
    
    try {
        if (storeId) {
            await api.updateStore(storeId, storeData);
            alert('Loja atualizada com sucesso!');
        } else {
            await api.createStore(storeData);
            alert('Loja criada com sucesso!');
        }
        
        closeStoreModal();
        loadStores();
        // Recarregar lojas no select de usuários também
        if (document.getElementById('userStoreInput')) {
            loadStoresForUserSelect();
        }
    } catch (error) {
        alert('Erro ao salvar loja: ' + (error.message || 'Erro desconhecido'));
    }
});

// Editar loja
async function editStore(storeId) {
    openStoreModal(storeId);
}

// Excluir loja
async function deleteStore(storeId) {
    if (!confirm('Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita se não houver registros vinculados.')) {
        return;
    }
    
    try {
        await api.deleteStore(storeId);
        alert('Loja excluída com sucesso!');
        loadStores();
        // Recarregar lojas no select de usuários também
        if (document.getElementById('userStoreInput')) {
            loadStoresForUserSelect();
        }
    } catch (error) {
        alert('Erro ao excluir loja: ' + (error.message || 'Erro desconhecido'));
    }
}

// Carregar lojas para o select de usuários
async function loadStoresForUserSelect() {
    try {
        const stores = await api.getStores();
        const select = document.getElementById('userStoreInput');
        if (!select) return;
        
        select.innerHTML = '<option value="">Nenhuma (apenas Admin)</option>' +
            stores.filter(s => s.is_active).map(store => 
                `<option value="${store.id}">${store.name}</option>`
            ).join('');
    } catch (error) {
        console.error('Erro ao carregar lojas para select:', error);
    }
}

// Fechar modal ao clicar fora, sem atrapalhar seleção de texto
window.addEventListener('click', function(event) {
    // Se o usuário está selecionando texto, não fechar modais
    try {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return;
        }
    } catch (e) {
        // Ignorar erros de seleção
    }

    const userModal = document.getElementById('userModal');
    const storeModal = document.getElementById('storeModal');

    if (event.target === userModal) {
        closeUserModal();
    }
    if (event.target === storeModal) {
        closeStoreModal();
    }
});

// Carregar configurações ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    loadConfigurations();
    
    // Verificar autenticação
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
        window.location.href = 'login.html';
    }
    
    document.getElementById('userName').textContent = user.name || 'Usuário';
});

// ========================================
// IMPORTAÇÃO E EXPORTAÇÃO DE DADOS
// ========================================

// Carregar lojas para o select de exportação e importação
async function loadStoresForExport() {
    try {
        const stores = await api.getStores();
        const exportSelect = document.getElementById('exportStoreSelect');
        const importSelect = document.getElementById('importStoreSelect');
        
        // Limpar e preencher select de exportação
        if (exportSelect) {
            exportSelect.innerHTML = '<option value="">Todas as Lojas (Exportação Completa)</option>';
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                exportSelect.appendChild(option);
            });
        }
        
        // Limpar e preencher select de importação
        if (importSelect) {
            importSelect.innerHTML = '<option value="">Usar lojas do arquivo (manter estrutura original)</option>';
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                importSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar lojas para exportação/importação:', error);
    }
}

// Funções auxiliares para checkboxes
function selectAllExport() {
    document.getElementById('exportStores').checked = true;
    document.getElementById('exportProducts').checked = true;
    document.getElementById('exportCustomers').checked = true;
    document.getElementById('exportSales').checked = true;
    document.getElementById('exportServiceOrders').checked = true;
    document.getElementById('exportCategories').checked = true;
    document.getElementById('exportSuppliers').checked = true;
    document.getElementById('exportAccountsReceivable').checked = true;
    document.getElementById('exportAccountsPayable').checked = true;
    document.getElementById('exportStockMovements').checked = true;
}

function deselectAllExport() {
    document.getElementById('exportStores').checked = false;
    document.getElementById('exportProducts').checked = false;
    document.getElementById('exportCustomers').checked = false;
    document.getElementById('exportSales').checked = false;
    document.getElementById('exportServiceOrders').checked = false;
    document.getElementById('exportCategories').checked = false;
    document.getElementById('exportSuppliers').checked = false;
    document.getElementById('exportAccountsReceivable').checked = false;
    document.getElementById('exportAccountsPayable').checked = false;
    document.getElementById('exportStockMovements').checked = false;
}

function selectAllImport() {
    document.getElementById('importStores').checked = true;
    document.getElementById('importProducts').checked = true;
    document.getElementById('importCustomers').checked = true;
    document.getElementById('importSales').checked = true;
    document.getElementById('importServiceOrders').checked = true;
    document.getElementById('importCategories').checked = true;
    document.getElementById('importSuppliers').checked = true;
    document.getElementById('importAccountsReceivable').checked = true;
    document.getElementById('importAccountsPayable').checked = true;
    document.getElementById('importStockMovements').checked = true;
}

function deselectAllImport() {
    document.getElementById('importStores').checked = false;
    document.getElementById('importProducts').checked = false;
    document.getElementById('importCustomers').checked = false;
    document.getElementById('importSales').checked = false;
    document.getElementById('importServiceOrders').checked = false;
    document.getElementById('importCategories').checked = false;
    document.getElementById('importSuppliers').checked = false;
    document.getElementById('importAccountsReceivable').checked = false;
    document.getElementById('importAccountsPayable').checked = false;
    document.getElementById('importStockMovements').checked = false;
}

// Exportar dados
async function exportData() {
    try {
        const storeId = document.getElementById('exportStoreSelect').value;
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('Você precisa estar logado para exportar dados.');
            return;
        }

        // Obter tipos de dados selecionados
        const dataTypes = [];
        if (document.getElementById('exportStores').checked) dataTypes.push('stores');
        if (document.getElementById('exportProducts').checked) dataTypes.push('products');
        if (document.getElementById('exportCustomers').checked) dataTypes.push('customers');
        if (document.getElementById('exportSales').checked) dataTypes.push('sales');
        if (document.getElementById('exportServiceOrders').checked) dataTypes.push('service_orders');
        if (document.getElementById('exportCategories').checked) dataTypes.push('categories');
        if (document.getElementById('exportSuppliers').checked) dataTypes.push('suppliers');
        if (document.getElementById('exportAccountsReceivable').checked) dataTypes.push('accounts_receivable');
        if (document.getElementById('exportAccountsPayable').checked) dataTypes.push('accounts_payable');
        if (document.getElementById('exportStockMovements').checked) dataTypes.push('stock_movements');

        if (dataTypes.length === 0) {
            alert('Por favor, selecione pelo menos um tipo de dado para exportar.');
            return;
        }

        // Construir URL com parâmetros
        let url = '/api/data/export?';
        const params = [];
        if (storeId) {
            params.push(`store_id=${storeId}`);
        }
        params.push(`types=${dataTypes.join(',')}`);
        url += params.join('&');

        // Fazer requisição e baixar arquivo
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao exportar dados');
        }

        // Obter nome do arquivo do header ou usar padrão
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'smartshow_export.json';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        // Criar blob e fazer download
        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);

        alert('Dados exportados com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        alert('Erro ao exportar dados: ' + error.message);
    }
}

// Importar dados
async function importData() {
    try {
        const fileInput = document.getElementById('importFileInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Por favor, selecione um arquivo JSON para importar.');
            return;
        }

        if (!file.name.endsWith('.json')) {
            alert('Por favor, selecione um arquivo JSON válido.');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Você precisa estar logado para importar dados.');
            return;
        }

        // Obter nome da loja selecionada
        const importStoreSelect = document.getElementById('importStoreSelect');
        const selectedStoreOption = importStoreSelect.options[importStoreSelect.selectedIndex];
        const selectedStoreName = selectedStoreOption ? selectedStoreOption.textContent : 'Usar lojas do arquivo';

        // Confirmar importação
        let confirmMessage = 'Esta operação irá importar dados do arquivo selecionado.\n\n';
        confirmMessage += `Loja de destino: ${selectedStoreName}\n\n`;
        confirmMessage += 'O sistema fará o tratamento automático dos dados, mapeando campos e criando relacionamentos.\n\n';
        confirmMessage += 'Deseja continuar?';
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Mostrar progresso
        const progressDiv = document.getElementById('importProgress');
        const statusDiv = document.getElementById('importStatus');
        progressDiv.style.display = 'block';
        statusDiv.textContent = 'Enviando arquivo...';

        // Obter loja de destino selecionada
        const targetStoreId = document.getElementById('importStoreSelect').value;

        // Obter tipos de dados selecionados
        const dataTypes = [];
        if (document.getElementById('importStores').checked) dataTypes.push('stores');
        if (document.getElementById('importProducts').checked) dataTypes.push('products');
        if (document.getElementById('importCustomers').checked) dataTypes.push('customers');
        if (document.getElementById('importSales').checked) dataTypes.push('sales');
        if (document.getElementById('importServiceOrders').checked) dataTypes.push('service_orders');
        if (document.getElementById('importCategories').checked) dataTypes.push('categories');
        if (document.getElementById('importSuppliers').checked) dataTypes.push('suppliers');
        if (document.getElementById('importAccountsReceivable').checked) dataTypes.push('accounts_receivable');
        if (document.getElementById('importAccountsPayable').checked) dataTypes.push('accounts_payable');
        if (document.getElementById('importStockMovements').checked) dataTypes.push('stock_movements');

        if (dataTypes.length === 0) {
            alert('Por favor, selecione pelo menos um tipo de dado para importar.');
            return;
        }

        // Criar FormData
        const formData = new FormData();
        formData.append('file', file);
        if (targetStoreId) {
            formData.append('target_store_id', targetStoreId);
        }
        formData.append('types', dataTypes.join(','));

        // Fazer requisição
        const response = await fetch('/api/data/import', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao importar dados');
        }

        // Mostrar resultados
        let resultMessage = 'Importação concluída com sucesso!\n\n';
        resultMessage += 'Resumo:\n';
        
        if (data.results) {
            Object.keys(data.results).forEach(key => {
                const result = data.results[key];
                if (result.created > 0 || result.updated > 0) {
                    resultMessage += `\n${key}:\n`;
                    if (result.created > 0) resultMessage += `  - Criados: ${result.created}\n`;
                    if (result.updated > 0) resultMessage += `  - Atualizados: ${result.updated}\n`;
                    if (result.errors && result.errors.length > 0) {
                        resultMessage += `  - Erros: ${result.errors.length}\n`;
                    }
                }
            });
        }

        statusDiv.textContent = resultMessage.replace(/\n/g, '<br>');
        statusDiv.style.color = '#48bb78';
        
        // Limpar input
        fileInput.value = '';

        // Recarregar dados se necessário
        if (data.results && (data.results.stores.created > 0 || data.results.stores.updated > 0)) {
            loadStores();
            loadStoresForExport();
        }
        if (data.results && (data.results.users && (data.results.users.created > 0 || data.results.users.updated > 0))) {
            loadUsers();
        }

        alert('Importação concluída! Verifique os detalhes abaixo.');
    } catch (error) {
        console.error('Erro ao importar dados:', error);
        const statusDiv = document.getElementById('importStatus');
        statusDiv.textContent = 'Erro: ' + error.message;
        statusDiv.style.color = '#f56565';
        alert('Erro ao importar dados: ' + error.message);
    }
}


