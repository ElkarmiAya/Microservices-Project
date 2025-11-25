const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const inventoryService = require('../services/inventory.service');

// Routes pour les commandes
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getAllOrders);
router.get('/orders/:id', orderController.getOrderById);
router.put('/orders/:id/status', orderController.updateOrderStatus);
router.delete('/orders/:id', orderController.cancelOrder);

// Route pour récupérer les items disponibles depuis l'inventory service
router.get('/items', orderController.getAvailableItems);

// ✅ Endpoint simple pour vérifier l'état du circuit
router.get('/health', (req, res) => {
  const status = inventoryService.getStatus();
  res.json({
    service: 'Order Service',
    status: 'running',
    inventoryService: status,
    timestamp: new Date().toISOString()
  });
});


module.exports = router;