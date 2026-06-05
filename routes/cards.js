const express = require('express');
const controller = require('../controllers/cardsController');

const router = express.Router();

// GET    /api/cards          — list all cards (optionally filter by ?column=todo)
// GET    /api/cards/:id      — get a single card by id
// POST   /api/cards          — create a new card
// PUT    /api/cards/:id      — partial update of a card
// DELETE /api/cards/:id      — delete a card
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
