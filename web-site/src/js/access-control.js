// ========================================
// CONTROLE DE ACESSO BASEADO EM FUNÇÃO
// ========================================

// Definir permissões por função
const rolePermissions = {
    admin: {
        pages: ['dashboard', 'caixa', 'produtos', 'clientes', 'assistencia', 'financeiro', 'relatorios', 'configuracao'],
        defaultPage: 'dashboard',
        canManageUsers: true
    },
    gerente: {
        pages: ['dashboard', 'caixa', 'produtos', 'clientes', 'assistencia', 'financeiro', 'relatorios'],
        defaultPage: 'dashboard',
        canManageUsers: false
    },
    caixa: {
        pages: ['caixa', 'produtos', 'clientes', 'assistencia'],
        defaultPage: 'caixa',
        canManageUsers: false
    },
    vendedor: {
        pages: ['caixa', 'produtos', 'clientes'],
        defaultPage: 'caixa',
        canManageUsers: false
    },
    tecnico: {
        pages: ['assistencia', 'produtos'],
        defaultPage: 'assistencia',
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
        // Redirecionar para a página padrão do usuário SEM alerta (mais suave)
        const defaultPage = permissions.defaultPage || 'caixa';
        console.log(`🚫 Usuário ${role} não tem acesso a ${pageName}. Redirecionando para ${defaultPage}.html`);
        window.location.href = `${defaultPage}.html`;
        return;
    }
    
    // Esconder TODOS os itens de navegação primeiro
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // Mostrar apenas os itens permitidos
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href) {
            let page = href.replace('.html', '');
            // Mapear index.html para dashboard
            if (page === 'index' || page === '') {
                page = 'dashboard';
            }
            
            // Se a página está nas permissões, mostrar
            if (permissions.pages.includes(page)) {
                item.style.display = 'inline-block';
            } else {
                // Garantir que está oculto
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
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação primeiro
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        // Se não estiver autenticado, redirecionar para login
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    // Aplicar controle de acesso
    applyAccessControl();
});

// Exportar para uso em outros arquivos
window.hasAccessToPage = hasAccessToPage;
window.rolePermissions = rolePermissions;






