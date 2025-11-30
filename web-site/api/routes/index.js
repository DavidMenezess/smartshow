// ========================================
// ROTAS PRINCIPAIS DA API
// ========================================

const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./auth');
const productsRoutes = require('./products');
const salesRoutes = require('./sales');
const customersRoutes = require('./customers');
const serviceOrdersRoutes = require('./serviceOrders');
const financialRoutes = require('./financial');
const reportsRoutes = require('./reports');
const printRoutes = require('./print');
const categoriesRoutes = require('./categories');
const suppliersRoutes = require('./suppliers');
const usersRoutes = require('./users');
const cashRoutes = require('./cash');
const storesRoutes = require('./stores');
const dataRoutes = require('./data');
const returnsRoutes = require('./returns');

// Usar rotas
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/sales', salesRoutes);
router.use('/customers', customersRoutes);
router.use('/service-orders', serviceOrdersRoutes);
router.use('/financial', financialRoutes);
router.use('/reports', reportsRoutes);
router.use('/print', printRoutes);
router.use('/categories', categoriesRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/users', usersRoutes);
router.use('/cash', cashRoutes);
router.use('/stores', storesRoutes);
router.use('/data', dataRoutes);
router.use('/returns', returnsRoutes);

module.exports = router;



