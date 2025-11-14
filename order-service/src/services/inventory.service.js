const axios = require('axios');

class InventoryService {
  constructor() {
    this.baseURL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8000';
  }

  // Vérifier si un item existe et a assez de stock
  async checkItemAvailability(itemId, quantity) {
    try {
      const response = await axios.get(`${this.baseURL}/items`);
      const items = response.data;
      
      const item = items.find(i => i.id === itemId);
      
      if (!item) {
        return { available: false, message: 'Item non trouvé', item: null };
      }
      
      if (item.quantity < quantity) {
        return { 
          available: false, 
          message: `Stock insuffisant. Disponible: ${item.quantity}`, 
          item 
        };
      }
      
      return { available: true, message: 'Stock disponible', item };
    } catch (error) {
      console.error('Erreur lors de la vérification du stock:', error.message);
      throw new Error('Impossible de vérifier le stock dans l\'inventory service');
    }
  }

  // Récupérer tous les items
  async getAllItems() {
    try {
      const response = await axios.get(`${this.baseURL}/items`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des items:', error.message);
      throw new Error('Impossible de récupérer les items');
    }
  }

  // Décrémenter le stock (future fonctionnalité - nécessite un endpoint PUT dans inventory service)
  async decrementStock(itemId, quantity) {
    try {
      // À implémenter côté inventory service
      const response = await axios.put(`${this.baseURL}/items/${itemId}/decrement`, {
        quantity: quantity
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la décrémentation du stock:', error.message);
      throw new Error('Impossible de mettre à jour le stock');
    }
  }
  // ✅ NOUVEAU : Incrémenter le stock (pour les annulations)
  async incrementStock(itemId, quantity) {
    try {
      const response = await axios.put(`${this.baseURL}/items/${itemId}/increment`, {
        quantity: quantity
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du stock:', error.message);
      throw new Error('Impossible de restaurer le stock');
    }
  }
}

module.exports = new InventoryService();