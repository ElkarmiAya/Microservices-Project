const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
const orderRoutes = require('./routes/order.routes');

const app = express();
const PORT = process.env.PORT || 8001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;