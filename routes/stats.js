const express = require('express');
const controller = require('../controllers/statsController');

const router = express.Router();

// GET /api/stats/completions?days=14
router.get('/completions', controller.completions);

module.exports = router;
