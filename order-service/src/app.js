const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
const orderRoutes = require('./routes/order.routes');
const { register, metricsMiddleware } = require('./middleware/metrics');

const app = express();
const PORT = process.env.PORT || 8001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Ajouter le middleware de métriques
app.use(metricsMiddleware);

// ✅ Endpoint /health
app.get('/health', async (req, res) => {
  try {
    // Vérifier la connexion à la base de données
    await sequelize.authenticate();
    
    res.status(200).json({
      status: 'healthy',
      service: 'order-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'order-service',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ✅ Endpoint /metrics (format Prometheus)
app.get('/api/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Order Service is running' });
});

app.use('/api', orderRoutes);

// Synchroniser la base de données et démarrer le serveur
const startServer = async () => {
  try {
    // Synchroniser les modèles avec la base de données
    await sequelize.sync({ alter: true }); // alter: true pour mettre à jour les tables existantes
    console.log('✅ Base de données synchronisée');

    app.listen(PORT, () => {
      console.log(`🚀 Order Service démarré sur http://localhost:${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
      console.log(`📊 Métriques disponibles sur http://localhost:${PORT}/metrics`);
      console.log(`💚 Health check disponible sur http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  }
};





startServer();

module.exports = app;