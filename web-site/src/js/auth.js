// ========================================
// AUTENTICAÇÃO
// ========================================

// Verificar se está logado
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        // Redirecionar para login se não estiver autenticado
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return false;
    }

    // Atualizar nome do usuário na interface
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        const userData = JSON.parse(user);
        userNameEl.textContent = userData.name;
    }

    return true;
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});





















