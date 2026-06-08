const Card = require('../models/Card');
const Event = require('../models/Event');

/**
 * GET /api/stats/completions?days=14
 *
 * Returns daily completion counts for the last N days. A "completion"
 * means a card that is CURRENTLY in the Done column, bucketed by the
 * day it most recently became done.
 *
 * This means:
 *  - Moving a card OUT of Done immediately removes it from the chart.
 *  - Moving a card back to Done re-adds it (under the most recent date).
 *  - Cards created directly in Done are counted by their creation date.
 */
exports.completions = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 60);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const since = new Date(startOfToday.getTime() - (days - 1) * 86400000);

    // All cards currently in Done
    const doneCards = await Card.find({ column: 'done' })
      .select('_id createdAt')
      .lean();

    if (doneCards.length === 0) {
      // No completions at all — return empty series
      return res.json({
        days,
        total: 0,
        max: 0,
        series: buildEmptySeries(startOfToday, days),
      });
    }

    const cardIds = doneCards.map((c) => c._id);

    // All "moved to done" events for those cards, newest first
    const events = await Event.find({
      type: 'moved',
      'details.to': 'done',
      cardId: { $in: cardIds },
    })
      .sort({ createdAt: -1 })
      .select('createdAt cardId')
      .lean();

    // For each currently-Done card, the most recent moved-to-done event
    const completionDate = new Map();
    for (const e of events) {
      const key = String(e.cardId);
      if (!completionDate.has(key)) completionDate.set(key, new Date(e.createdAt));
    }
    // Cards without any move event (e.g., created directly in Done)
    // fall back to their createdAt timestamp
    for (const card of doneCards) {
      const key = String(card._id);
      if (!completionDate.has(key)) completionDate.set(key, new Date(card.createdAt));
    }

    // Bucket by local day (within the window)
    const byDay = {};
    for (const date of completionDate.values()) {
      if (date < since) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      byDay[key] = (byDay[key] || 0) + 1;
    }

    const series = buildSeries(startOfToday, days, byDay);
    const total = series.reduce((sum, p) => sum + p.count, 0);
    const max = series.reduce((m, p) => Math.max(m, p.count), 0);

    res.json({ days, total, max, series });
  } catch (err) {
    next(err);
  }
};

function buildEmptySeries(startOfToday, days) {
  return buildSeries(startOfToday, days, {});
}

function buildSeries(startOfToday, days, byDay) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(startOfToday.getTime() - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({
      date: key,
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
      count: byDay[key] || 0,
    });
  }
  return result;
}
