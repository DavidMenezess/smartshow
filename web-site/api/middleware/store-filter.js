// ========================================
// MIDDLEWARE PARA FILTRAR POR LOJA
// ========================================

/**
 * Helper para obter o store_id baseado no usuário
 * Admin e Gerente podem ver todas as lojas (store_id = null)
 * Outros usuários veem apenas sua loja
 */
function getStoreFilter(user, storeIdParam = null) {
    // Se admin ou gerente, podem ver todas as lojas (não filtrar)
    if (user.role === 'admin' || user.role === 'gerente') {
        // Se foi passado um store_id como parâmetro, usar esse
        if (storeIdParam) {
            const parsedStoreId = parseInt(storeIdParam);
            return { store_id: isNaN(parsedStoreId) ? null : parsedStoreId, canSeeAll: false };
        }
        // Caso contrário, pode ver todas
        return { store_id: null, canSeeAll: true };
    }
    
    // Outros usuários veem apenas sua loja
    // Garantir que store_id seja sempre um número válido
    const userStoreId = user.store_id ? parseInt(user.store_id) : null;
    return { store_id: (userStoreId && !isNaN(userStoreId) && userStoreId > 0) ? userStoreId : null, canSeeAll: false };
}

/**
 * Adiciona condição WHERE para filtrar por loja nas queries
 */
function addStoreFilter(sql, params, user, storeIdParam = null) {
    const filter = getStoreFilter(user, storeIdParam);
    
    if (filter.canSeeAll && !filter.store_id) {
        // Admin/Gerente sem filtro específico - não adicionar WHERE
        return { sql, params };
    }
    
    // Adicionar filtro de loja
    const whereClause = filter.store_id 
        ? ' AND store_id = ?'
        : ' AND store_id IS NULL';
    
    return {
        sql: sql + whereClause,
        params: [...params, filter.store_id]
    };
}

module.exports = {
    getStoreFilter,
    addStoreFilter
};









