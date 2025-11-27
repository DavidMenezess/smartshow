// ========================================
// ROTAS DE ORDENS DE SERVIÇO
// ========================================

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Listar ordens de serviço
router.get('/', auth, async (req, res) => {
    try {
        const { status, customerId, technicianId } = req.query;
        const user = req.user;
        
        let sql = `
            SELECT os.*, 
                   c.name as customer_name, c.phone as customer_phone,
                   u.name as technician_name
            FROM service_orders os
            LEFT JOIN customers c ON os.customer_id = c.id
            LEFT JOIN users u ON os.technician_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            sql += ` AND os.store_id = ?`;
            params.push(user.store_id);
        }

        if (status) {
            sql += ` AND os.status = ?`;
            params.push(status);
        }

        if (customerId) {
            sql += ` AND os.customer_id = ?`;
            params.push(customerId);
        }

        if (technicianId) {
            sql += ` AND os.technician_id = ?`;
            params.push(technicianId);
        }

        sql += ` ORDER BY os.created_at DESC`;

        const orders = await db.all(sql, params);
        res.json(orders);
    } catch (error) {
        console.error('Erro ao listar ordens de serviço:', error);
        res.status(500).json({ error: 'Erro ao listar ordens de serviço' });
    }
});

// Obter ordem de serviço por ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        let sql = `
            SELECT os.*, 
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   u.name as technician_name
            FROM service_orders os
            LEFT JOIN customers c ON os.customer_id = c.id
            LEFT JOIN users u ON os.technician_id = u.id
            WHERE os.id = ?
        `;
        const params = [id];

        // Filtrar por loja (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            sql += ` AND os.store_id = ?`;
            params.push(user.store_id);
        }
        
        const order = await db.get(sql, params);

        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
        }

        res.json(order);
    } catch (error) {
        console.error('Erro ao obter ordem de serviço:', error);
        res.status(500).json({ error: 'Erro ao obter ordem de serviço' });
    }
});

// Criar ordem de serviço
router.post('/', auth, async (req, res) => {
    try {
        const {
            customerId, deviceType, brand, model, serialNumber,
            problemDescription, technicianId
        } = req.body;
        const user = req.user;

        if (!customerId || !problemDescription) {
            return res.status(400).json({ error: 'Cliente e descrição do problema são obrigatórios' });
        }

        // Verificar se o cliente pertence à loja do usuário (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            const customer = await db.get('SELECT store_id FROM customers WHERE id = ?', [customerId]);
            if (!customer || customer.store_id !== user.store_id) {
                return res.status(403).json({ error: 'Acesso negado. Cliente não pertence à sua loja.' });
            }
        }

        const orderNumber = `OS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const { status } = req.body;
        const defaultStatus = status || 'aguardando_autorizacao';

        // Definir store_id automaticamente (exceto admin)
        const storeId = (user.role === 'admin' && req.body.store_id) ? req.body.store_id : user.store_id;

        const result = await db.run(
            `INSERT INTO service_orders 
             (order_number, customer_id, technician_id, device_type, brand, model, 
              serial_number, problem_description, status, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderNumber, customerId, technicianId || null, deviceType || null, brand || null,
             model || null, serialNumber || null, problemDescription, defaultStatus, storeId || null]
        );

        const order = await db.get('SELECT * FROM service_orders WHERE id = ?', [result.lastID]);
        res.status(201).json(order);
    } catch (error) {
        console.error('Erro ao criar ordem de serviço:', error);
        res.status(500).json({ error: 'Erro ao criar ordem de serviço' });
    }
});

// Atualizar ordem de serviço
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const {
            technicianId, diagnostic, estimatedValue, laborCost, partsCost,
            totalValue, status
        } = req.body;

        // Verificar se a OS pertence à loja do usuário (exceto admin/gerente)
        if (user.role !== 'admin' && user.role !== 'gerente' && user.store_id) {
            const order = await db.get('SELECT store_id FROM service_orders WHERE id = ?', [id]);
            if (!order || order.store_id !== user.store_id) {
                return res.status(403).json({ error: 'Acesso negado. Ordem de serviço não pertence à sua loja.' });
            }
        }

        const updateFields = [];
        const params = [];

        if (technicianId !== undefined) {
            updateFields.push('technician_id = ?');
            params.push(technicianId);
        }

        if (diagnostic !== undefined) {
            updateFields.push('diagnostic = ?');
            params.push(diagnostic);
        }

        if (estimatedValue !== undefined) {
            updateFields.push('estimated_value = ?');
            params.push(estimatedValue);
        }

        if (laborCost !== undefined) {
            updateFields.push('labor_cost = ?');
            params.push(laborCost);
        }

        if (partsCost !== undefined) {
            updateFields.push('parts_cost = ?');
            params.push(partsCost);
        }

        if (totalValue !== undefined) {
            updateFields.push('total_value = ?');
            params.push(totalValue);
        }

        if (status !== undefined) {
            updateFields.push('status = ?');
            params.push(status);

            if (status === 'completed') {
                updateFields.push('completed_at = CURRENT_TIMESTAMP');
            } else if (status === 'delivered') {
                updateFields.push('delivered_at = CURRENT_TIMESTAMP');
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);

        await db.run(
            `UPDATE service_orders SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        const order = await db.get('SELECT * FROM service_orders WHERE id = ?', [id]);
        res.json(order);
    } catch (error) {
        console.error('Erro ao atualizar ordem de serviço:', error);
        res.status(500).json({ error: 'Erro ao atualizar ordem de serviço' });
    }
});

module.exports = router;








