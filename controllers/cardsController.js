const mongoose = require('mongoose');
const Card = require('../models/Card');
const Event = require('../models/Event');
const { validateCardBody, validateCardUpdateBody } = require('../middleware/validate');

/**
 * Fire-and-forget event logging — never blocks the main response.
 * Failures are logged but don't propagate (don't fail the user's action
 * just because we couldn't log an event).
 */
function logEvent(type, cardId, cardText, details = {}) {
  Event.create({ type, cardId, cardText, details }).catch((err) => {
    console.warn('Event log failed:', err.message);
  });
}

/** Diff a card's before/after state to figure out what changed. */
function detectChanges(before, after) {
  const changed = {};
  if (after.text !== undefined && before.text !== after.text) {
    changed.text = { from: before.text, to: after.text };
  }
  if (after.priority !== undefined && before.priority !== after.priority) {
    changed.priority = { from: before.priority, to: after.priority };
  }
  if (after.dueDate !== undefined && (before.dueDate || '') !== (after.dueDate || '')) {
    changed.dueDate = { from: before.dueDate || '', to: after.dueDate || '' };
  }
  return changed;
}

/** Compare subtask arrays to detect a toggle event. */
function detectSubtaskToggle(beforeSubs, afterSubs) {
  if (!Array.isArray(beforeSubs) || !Array.isArray(afterSubs)) return null;
  if (beforeSubs.length !== afterSubs.length) return null;
  // Look for a single subtask that changed done state
  for (let i = 0; i < beforeSubs.length; i++) {
    if (beforeSubs[i].text === afterSubs[i].text && beforeSubs[i].done !== afterSubs[i].done) {
      return { text: afterSubs[i].text, done: afterSubs[i].done };
    }
  }
  return null;
}

/**
 * GET /api/cards
 * Optional query: ?column=todo|doing|done
 */
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.column) {
      if (!Card.COLUMNS.includes(req.query.column)) {
        return res.status(400).json({
          error: `column must be one of: ${Card.COLUMNS.join(', ')}`,
        });
      }
      filter.column = req.query.column;
    }
    const cards = await Card.find(filter).sort({ createdAt: -1 });
    res.json({ count: cards.length, cards });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cards/:id
 */
exports.getOne = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid card id' });
    }
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cards
 * Body: { text, column?, priority?, dueDate?, subtasks? }
 */
exports.create = async (req, res, next) => {
  try {
    const errors = validateCardBody(req.body);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const card = await Card.create({
      text: req.body.text.trim(),
      column: req.body.column || 'todo',
      priority: req.body.priority || 'medium',
      dueDate: req.body.dueDate || '',
      subtasks: Array.isArray(req.body.subtasks)
        ? req.body.subtasks.map((s) => ({ text: s.text.trim(), done: !!s.done }))
        : [],
    });

    logEvent('created', card._id, card.text, {
      column: card.column,
      priority: card.priority,
    });

    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/cards/:id
 * Partial update — only fields present in body are changed.
 * Body: any subset of { text, column, priority, dueDate, subtasks }
 */
exports.update = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid card id' });
    }
    const errors = validateCardUpdateBody(req.body);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Build the update object — only include fields actually sent
    const update = {};
    if (req.body.text !== undefined) update.text = req.body.text.trim();
    if (req.body.column !== undefined) update.column = req.body.column;
    if (req.body.priority !== undefined) update.priority = req.body.priority;
    if (req.body.dueDate !== undefined) update.dueDate = req.body.dueDate || '';
    if (req.body.subtasks !== undefined) {
      update.subtasks = req.body.subtasks.map((s) => ({
        text: s.text.trim(),
        done: !!s.done,
      }));
    }

    // Grab the BEFORE state so we can diff and emit specific event types
    const before = await Card.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Card not found' });

    const card = await Card.findByIdAndUpdate(req.params.id, update, {
      new: true,            // return the updated doc, not the old one
      runValidators: true,  // run Mongoose schema validators on the update
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // Emit the most specific event we can detect
    if (update.column !== undefined && before.column !== card.column) {
      logEvent('moved', card._id, card.text, {
        from: before.column,
        to: card.column,
      });
    } else if (update.subtasks !== undefined) {
      const toggle = detectSubtaskToggle(before.subtasks, card.subtasks);
      if (toggle) {
        logEvent('subtask_toggled', card._id, card.text, toggle);
      } else {
        logEvent('updated', card._id, card.text, { fields: ['subtasks'] });
      }
    } else {
      const changes = detectChanges(before, card);
      if (Object.keys(changes).length) {
        logEvent('updated', card._id, card.text, { changes });
      }
    }

    res.json(card);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cards/:id
 * Removes the card permanently.
 */
exports.remove = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid card id' });
    }
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    logEvent('deleted', null, card.text, { column: card.column });

    res.status(204).end(); // 204 No Content — success, nothing to return
  } catch (err) {
    next(err);
  }
};
