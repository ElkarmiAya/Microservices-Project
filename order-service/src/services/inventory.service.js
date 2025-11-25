const axios = require('axios');
const CircuitBreaker = require('opossum');

class InventoryService {
  constructor() {
    this.baseURL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8000';
    
    // ✅ UN SEUL circuit breaker pour toutes les requêtes HTTP
    this.breaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 5000,              // 5 secondes max
      errorThresholdPercentage: 50, // Ouvrir si 50% d'erreurs
      resetTimeout: 30000,        // Réessayer après 30 secondes
      name: 'InventoryService'
    });

    // Logs simples
    this.breaker.on('open', () => console.error('⚠️  Circuit OUVERT - Service Inventory indisponible'));
    this.breaker.on('halfOpen', () => console.warn('🔄 Circuit SEMI-OUVERT - Test de récupération'));
    this.breaker.on('close', () => console.log('✅ Circuit FERMÉ - Service rétabli'));

    // Fallback global
    this.breaker.fallback(() => ({ 
      error: true, 
      message: 'Service temporairement indisponible' 
    }));
  }

  // ✅ Méthode générique pour faire des requêtes HTTP
  async makeRequest(method, url, data = null) {
    const config = {
      method,
      url: `${this.baseURL}${url}`,
      timeout: 5000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  // ============================================
  // Méthodes publiques (interface simple)
  // ============================================

  async checkItemAvailability(itemId, quantity) {
    try {
      const item = await this.breaker.fire('get', `/items/${itemId}`);
      
      // Si fallback activé
      if (item.error) {
        return { 
          available: false, 
          message: item.message, 
          item: null 
        };
      }
      
      // Vérifier la quantité
      if (item.quantity < quantity) {
        return { 
          available: false, 
          message: `Stock insuffisant. Disponible: ${item.quantity}`, 
          item 
        };
      }
      
      return { available: true, message: 'Stock disponible', item };
      
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return { available: false, message: 'Item non trouvé', item: null };
      }
      throw new Error('Impossible de vérifier le stock');
    }
  }

  async getAllItems() {
    try {
      const items = await this.breaker.fire('get', '/items');
      
      // Si fallback activé, retourner tableau vide
      if (items.error) {
        return [];
      }
      
      return items;
    } catch (error) {
      console.error('Erreur lors de la récupération des items:', error.message);
      return [];
    }
  }

  async decrementStock(itemId, quantity) {
    try {
      const result = await this.breaker.fire('put', `/items/${itemId}/decrement`, { quantity });
      
      if (result.error) {
        throw new Error('Service indisponible. Impossible de décrémenter le stock.');
      }
      
      return result;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  }

  async incrementStock(itemId, quantity) {
    try {
      const result = await this.breaker.fire('put', `/items/${itemId}/increment`, { quantity });
      
      if (result.error) {
        throw new Error('Service indisponible. Impossible de restaurer le stock.');
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Obtenir l'état du circuit
  getStatus() {
    return {
      name: 'InventoryService',
      state: this.breaker.opened ? 'OPEN' : 
             this.breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: this.breaker.stats
    };
  }
}

module.exports = new InventoryService();