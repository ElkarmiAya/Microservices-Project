const Order = require('../models/order.model');
const inventoryService = require('./inventory.service');

class OrderService {
  // Créer une nouvelle commande
  async createOrder(orderData) {
    try {
      // 1. Vérifier la disponibilité du stock
      const { available, message, item } = await inventoryService.checkItemAvailability(
        orderData.item_id,
        orderData.quantity
      );

      if (!available) {
        throw new Error(message);
      }

      // 2. Créer la commande
      const order = await Order.create({
        item_id: orderData.item_id,
        item_name: item.name,
        quantity: orderData.quantity,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        status: 'pending',
        total_price: orderData.total_price || null
      });

      // 3. (Optionnel) Décrémenter le stock
      await inventoryService.decrementStock(orderData.item_id, orderData.quantity);

      return order;
    } catch (error) {
      throw error;
    }
  }

  // Récupérer toutes les commandes
  async getAllOrders() {
    try {
      return await Order.findAll({
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer une commande par ID
  async getOrderById(orderId) {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error('Commande non trouvée');
      }
      return order;
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour le statut d'une commande
  async updateOrderStatus(orderId, status) {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error('Commande non trouvée');
      }

      order.status = status;
      await order.save();
      return order;
    } catch (error) {
      throw error;
    }
  }

  // ✅ AMÉLIORÉ : Annuler une commande et restaurer le stock
  async cancelOrder(orderId) {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error('Commande non trouvée');
      }

      if (order.status === 'cancelled') {
        throw new Error('Commande déjà annulée');
      }

      if (order.status === 'completed') {
        throw new Error('Impossible d\'annuler une commande terminée');
      }

      // Restaurer le stock
      await inventoryService.incrementStock(order.item_id, order.quantity);

      // Mettre à jour le statut
      order.status = 'cancelled';
      await order.save();

      return order;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new OrderService();