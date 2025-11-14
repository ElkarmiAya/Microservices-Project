const orderService = require('../services/order.service');
const inventoryService = require('../services/inventory.service');

class OrderController {
  // Créer une commande
  async createOrder(req, res) {
    try {
      const orderData = req.body;
      const order = await orderService.createOrder(orderData);
      
      res.status(201).json({
        success: true,
        message: 'Commande créée avec succès',
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer toutes les commandes
  async getAllOrders(req, res) {
    try {
      const orders = await orderService.getAllOrders();
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer une commande par ID
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Mettre à jour le statut d'une commande
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await orderService.updateOrderStatus(id, status);
      res.status(200).json({
        success: true,
        message: 'Statut mis à jour',
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Annuler une commande
  async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const order = await orderService.cancelOrder(id);
      res.status(200).json({
        success: true,
        message: 'Commande annulée',
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Récupérer les items disponibles depuis l'inventory service
  async getAvailableItems(req, res) {
    try {
      const items = await inventoryService.getAllItems();
      res.status(200).json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new OrderController();