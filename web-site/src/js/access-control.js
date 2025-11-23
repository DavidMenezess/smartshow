// ========================================
// CONTROLE DE ACESSO BASEADO EM FUNÇÃO
// ========================================

// Definir permissões por função
const rolePermissions = {
    admin: {
        pages: ['dashboard', 'caixa', 'produtos', 'clientes', 'assistencia', 'financeiro', 'relatorios', 'configuracao'],
        canManageUsers: true
    },
    gerente: {
        pages: ['dashboard', 'caixa', 'produtos', 'clientes', 'assistencia', 'financeiro', 'relatorios'],
        canManageUsers: false
    },
    caixa: {
        pages: ['caixa', 'produtos', 'clientes', 'assistencia'],
        canManageUsers: false
    },
    vendedor: {
        pages: ['caixa', 'produtos', 'clientes'],
        canManageUsers: false
    },
    tecnico: {
        pages: ['assistencia', 'produtos'],
        canManageUsers: false
    }
};

// Verificar se usuário tem acesso à página
function hasAccessToPage(pageName) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || 'vendedor';
    const permissions = rolePermissions[role] || rolePermissions.vendedor;
    
    return permissions.pages.includes(pageName);
}

// Aplicar controle de acesso ao carregar a página
function applyAccessControl() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || 'vendedor';
    const permissions = rolePermissions[role] || rolePermissions.vendedor;
    
    // Obter nome da página atual
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    const pageName = currentPage === 'index' ? 'dashboard' : currentPage;
    
    // Verificar se tem acesso
    if (!hasAccessToPage(pageName)) {
        alert('Você não tem permissão para acessar esta página.');
        window.location.href = 'index.html';
        return;
    }
    
    // Esconder itens de navegação sem acesso
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href) {
            const page = href.replace('.html', '').replace('index', 'dashboard');
            if (!permissions.pages.includes(page)) {
                item.style.display = 'none';
            }
        }
    });
    
    // Mostrar link de configuração apenas para admin
    const configNavItem = document.getElementById('configNavItem');
    if (configNavItem) {
        if (role === 'admin') {
            configNavItem.style.display = 'inline-block';
        } else {
            configNavItem.style.display = 'none';
        }
    }
}

// Aplicar controle ao carregar
document.addEventListener('DOMContentLoaded', applyAccessControl);

// Exportar para uso em outros arquivos
window.hasAccessToPage = hasAccessToPage;
window.rolePermissions = rolePermissions;

