const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const shopsRoutes = require('./routes/shops');
const pricesRoutes = require('./routes/prices');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/prices', pricesRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Meat Menu API - Phase 1 (Backend)' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
