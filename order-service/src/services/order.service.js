const Order = require('../models/order.model');
const inventoryService = require('./inventory.service');
const {
  ordersCreatedTotal,
  orderErrorsTotal,
  totalRevenue,
  orderProcessingDuration,
  orderQuantity
} = require('../middleware/metrics');

class OrderService {
  // Créer une nouvelle commande
  async createOrder(orderData) {
    const startTime = Date.now();
    try {
      // 1. Vérifier la disponibilité du stock
      const { available, message, item } = await inventoryService.checkItemAvailability(
        orderData.item_id,
        orderData.quantity
      );
      if (!available) {
        // ✅ Counter : Erreur stock insuffisant
        orderErrorsTotal.inc({ error_type: 'insufficient_stock' });
        throw new Error(message);
      }
      // ✅ Calculer le prix total automatiquement
      const totalPrice = item.price * orderData.quantity;
      // 2. Décrémenter le stock
      await inventoryService.decrementStock(orderData.item_id, orderData.quantity);

      // 3. Créer la commande avec le prix calculé
      const order = await Order.create({
        item_id: orderData.item_id,
        item_name: item.name,
        quantity: orderData.quantity,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        status: 'confirmed',
        total_price: totalPrice  
      });
      // ✅ Counter : Commande créée avec succès
      ordersCreatedTotal.inc({ status: 'success' });
      // ✅ Histogram : Quantité commandée
      orderQuantity.observe(orderData.quantity);
       // ✅ Gauge : Mettre à jour les revenus
      totalRevenue.inc(parseFloat(totalPrice));
      // ✅ Histogram : Temps de traitement
      const duration = (Date.now() - startTime) / 1000;
      orderProcessingDuration.observe({ status: 'success' }, duration);
      return order;
    } catch (error) {
      // ✅ Counter : Erreur lors de la création
      ordersCreatedTotal.inc({ status: 'error' });
      orderErrorsTotal.inc({ error_type: 'creation_failed' });
      // ✅ Histogram : Temps de traitement (échec)
      const duration = (Date.now() - startTime) / 1000;
      orderProcessingDuration.observe({ status: 'error' }, duration);
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
        // ✅ Counter : Erreur commande non trouvée
        orderErrorsTotal.inc({ error_type: 'order_not_found' });
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
      // ✅ Gauge : Retirer du revenu total
      totalRevenue.dec(parseFloat(order.total_price));

      return order;
    } catch (error) {
      // ✅ Counter : Erreur restauration stock
      orderErrorsTotal.inc({ error_type: 'stock_restore_failed' });
      throw error;
    }
  }
}

module.exports = new OrderService();