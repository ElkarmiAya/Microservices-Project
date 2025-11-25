// Configuration de l'API Gateway
const API_BASE_URL = 'http://localhost/api';

// Utilitaires
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function formatPrice(price) {
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD'
    }).format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Vérifier la santé des services
async function checkHealth() {
    const statusElement = document.getElementById('health-status');
    try {
        const response = await fetch(`${API_BASE_URL}/orders/health`);
        if (response.ok) {
            statusElement.textContent = '✅ Services actifs';
            statusElement.className = 'health-status';
        } else {
            throw new Error('Service unavailable');
        }
    } catch (error) {
        statusElement.textContent = '❌ Services indisponibles';
        statusElement.className = 'health-status error';
    }
}

// ============================================
// GESTION DE L'INVENTAIRE
// ============================================

async function loadInventory() {
    const inventoryList = document.getElementById('inventory-list');
    const itemSelect = document.getElementById('order-item-id');
    
    inventoryList.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/items`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);
        
        const items = data.data || data;
        
        if (items.length === 0) {
            inventoryList.innerHTML = '<div class="empty">Aucun produit disponible</div>';
            itemSelect.innerHTML = '<option value="">Aucun produit disponible</option>';
            return;
        }
        
        // Afficher la liste des produits
        inventoryList.innerHTML = items.map(item => `
            <div class="item-card">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>Quantité en stock: <strong>${item.quantity}</strong></p>
                    <p class="price">${formatPrice(item.price)}</p>
                </div>
            </div>
        `).join('');
        
        // Mettre à jour le select pour les commandes
        itemSelect.innerHTML = '<option value="">Sélectionner un produit</option>' +
            items.map(item => `
                <option value="${item.id}" data-price="${item.price}" data-stock="${item.quantity}">
                    ${item.name} - Stock: ${item.quantity} - ${formatPrice(item.price)}
                </option>
            `).join('');
        
        updateStats();
    } catch (error) {
        inventoryList.innerHTML = `<div class="empty">Erreur: ${error.message}</div>`;
        showToast('Erreur lors du chargement de l\'inventaire', 'error');
    }
}

async function addItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('item-name').value;
    const quantity = parseInt(document.getElementById('item-quantity').value);
    const price = parseFloat(document.getElementById('item-price').value);
    
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, quantity, price })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || data.message);
        
        showToast('Produit ajouté avec succès!', 'success');
        event.target.reset();
        loadInventory();
    } catch (error) {
        showToast(`Erreur: ${error.message}`, 'error');
    }
}

// ============================================
// GESTION DES COMMANDES
// ============================================

async function loadOrders() {
    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/orders`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);
        
        const orders = data.data || data;
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<div class="empty">Aucune commande</div>';
            return;
        }
        
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-info">
                    <h4>Commande #${order.id}</h4>
                    <p><strong>${order.item_name}</strong> × ${order.quantity}</p>
                    <p>Client: ${order.customer_name} (${order.customer_email})</p>
                    <p>Total: <span class="price">${formatPrice(order.total_price)}</span></p>
                    <p>Date: ${formatDate(order.created_at)}</p>
                </div>
                <span class="status ${order.status}">${order.status.toUpperCase()}</span>
            </div>
        `).join('');
        
        updateStats();
    } catch (error) {
        ordersList.innerHTML = `<div class="empty">Erreur: ${error.message}</div>`;
        showToast('Erreur lors du chargement des commandes', 'error');
    }
}

async function createOrder(event) {
    event.preventDefault();
    
    const itemId = parseInt(document.getElementById('order-item-id').value);
    const quantity = parseInt(document.getElementById('order-quantity').value);
    const customerName = document.getElementById('customer-name').value;
    const customerEmail = document.getElementById('customer-email').value;
    
    if (!itemId) {
        showToast('Veuillez sélectionner un produit', 'warning');
        return;
    }
    
    // Vérifier le stock disponible
    const selectedOption = document.querySelector(`#order-item-id option[value="${itemId}"]`);
    const availableStock = parseInt(selectedOption.dataset.stock);
    
    if (quantity > availableStock) {
        showToast(`Stock insuffisant! Disponible: ${availableStock}`, 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                quantity,
                customer_name: customerName,
                customer_email: customerEmail
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);
        
        showToast('Commande créée avec succès!', 'success');
        event.target.reset();
        loadOrders();
        loadInventory(); // Rafraîchir l'inventaire
    } catch (error) {
        showToast(`Erreur: ${error.message}`, 'error');
    }
}

// ============================================
// STATISTIQUES
// ============================================

async function updateStats() {
    try {
        // Récupérer les produits
        const itemsResponse = await fetch(`${API_BASE_URL}/orders/items`);
        const itemsData = await itemsResponse.json();
        const items = itemsData.data || itemsData;
        
        // Récupérer les commandes
        const ordersResponse = await fetch(`${API_BASE_URL}/orders/orders`);
        const ordersData = await ordersResponse.json();
        const orders = ordersData.data || ordersData;
        
        // Calculer les statistiques
        const totalProducts = items.length;
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
        
        // Mettre à jour l'affichage
        document.getElementById('stat-products').textContent = totalProducts;
        document.getElementById('stat-orders').textContent = totalOrders;
        document.getElementById('stat-revenue').textContent = formatPrice(totalRevenue);
    } catch (error) {
        console.error('Erreur lors du calcul des statistiques:', error);
    }
}

// ============================================
// ÉVÉNEMENTS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Charger les données initiales
    checkHealth();
    loadInventory();
    loadOrders();
    
    // Vérifier la santé toutes les 30 secondes
    setInterval(checkHealth, 30000);
    
    // Formulaires
    document.getElementById('add-item-form').addEventListener('submit', addItem);
    document.getElementById('create-order-form').addEventListener('submit', createOrder);
    
    // Boutons de rafraîchissement
    document.getElementById('refresh-inventory').addEventListener('click', loadInventory);
    document.getElementById('refresh-orders').addEventListener('click', loadOrders);
});