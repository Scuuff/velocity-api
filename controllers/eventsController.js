const Event = require('../models/Event');

/**
 * GET /api/events
 * Returns recent events. Default limit 20, max 100.
 */
exports.list = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const events = await Event.find().sort({ createdAt: -1 }).limit(limit);
    res.json({ count: events.length, events });
  } catch (err) {
    next(err);
  }
};
