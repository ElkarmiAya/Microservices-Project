const client = require('prom-client');

// Créer un registre pour stocker les métriques
const register = new client.Registry();

// Collecter les métriques par défaut (CPU, mémoire, etc.)
client.collectDefaultMetrics({ register });

// ============================================
// 1️⃣ COUNTERS (Compteurs)
// ============================================

// Basique : Nombre total de requêtes HTTP
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Avancé : Nombre total de commandes créées
const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
  registers: [register]
});

// Avancé : Nombre d'erreurs métier
const orderErrorsTotal = new client.Counter({
  name: 'order_errors_total',
  help: 'Total number of order errors',
  labelNames: ['error_type'],
  registers: [register]
});


// ============================================
// 2️⃣ GAUGES (Jauges)
// ============================================

// Avancé : Revenus total en temps réel
const totalRevenue = new client.Gauge({
  name: 'total_revenue_mad',
  help: 'Total revenue in MAD',
  registers: [register]
});

// ============================================
// 3️⃣ HISTOGRAMS (Histogrammes)
// ============================================

// Basique : Durée des requêtes HTTP
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

// Avancé : Temps de traitement d'une commande
const orderProcessingDuration = new client.Histogram({
  name: 'order_processing_duration_seconds',
  help: 'Time taken to process an order',
  labelNames: ['status'],
  buckets: [0.5, 1, 2, 5, 10],
  registers: [register]
});

// Avancé : Quantité de produits par commande
const orderQuantity = new client.Histogram({
  name: 'order_quantity',
  help: 'Number of items per order',
  buckets: [1, 2, 5, 10, 20, 50],
  registers: [register]
});

// ============================================
// 4️⃣ SUMMARIES (Résumés)
// ============================================

// Basique : Temps de réponse API (avec percentiles)
const apiResponseTime = new client.Summary({
  name: 'api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['endpoint'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [register]
});


// Avancé : Temps de traitement dans la base de données
const databaseQueryTime = new client.Summary({
  name: 'database_query_time_seconds',
  help: 'Database query execution time',
  labelNames: ['operation'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [register]
});

// ============================================
// Middleware pour collecter les métriques HTTP
// ============================================
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    // Counter
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status: res.statusCode
    });

    // Histogram
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status: res.statusCode
    }, duration);

    // Summary
    apiResponseTime.observe({
      endpoint: route
    }, duration);
  });

  next();
};

module.exports = {
  register,
  metricsMiddleware,
  
  // Counters
  httpRequestsTotal,
  ordersCreatedTotal,
  orderErrorsTotal,
  
  // Gauges
  totalRevenue,
  
  // Histograms
  httpRequestDuration,
  orderProcessingDuration,
  orderQuantity,
  
  // Summaries
  apiResponseTime,
  databaseQueryTime
};