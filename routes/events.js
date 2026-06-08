const express = require('express');
const controller = require('../controllers/eventsController');

const router = express.Router();

// GET /api/events?limit=20 — recent events, newest first
router.get('/', controller.list);

module.exports = router;
