require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const cardRoutes = require('./routes/cards');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'velocity-api',
    status: 'ok',
    docs: 'Available endpoints: GET /api/cards, GET /api/cards/:id, POST /api/cards, PUT /api/cards/:id, DELETE /api/cards/:id',
  });
});

// API routes
app.use('/api/cards', cardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server only after DB is connected
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✓ velocity-api running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
