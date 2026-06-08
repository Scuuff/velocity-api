require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const cardRoutes = require('./routes/cards');
const eventRoutes = require('./routes/events');
const statsRoutes = require('./routes/stats');

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
    docs: 'Endpoints: GET/POST/PUT/DELETE /api/cards, GET /api/events',
  });
});

// API routes
app.use('/api/cards', cardRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/stats', statsRoutes);

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
