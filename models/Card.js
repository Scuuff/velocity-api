const mongoose = require('mongoose');

const COLUMNS = ['todo', 'doing', 'done'];
const PRIORITIES = ['easy', 'medium', 'hard'];

const subtaskSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 120 },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const cardSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    column: { type: String, enum: COLUMNS, default: 'todo' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    dueDate: { type: String, default: '' }, // 'YYYY-MM-DD' or ''
    subtasks: { type: [subtaskSchema], default: [] },
  },
  { timestamps: true }
);

// Validate dueDate format if provided
cardSchema.path('dueDate').validate(function (v) {
  if (!v) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T00:00:00'));
}, 'dueDate must be in YYYY-MM-DD format');

module.exports = mongoose.model('Card', cardSchema);
module.exports.COLUMNS = COLUMNS;
module.exports.PRIORITIES = PRIORITIES;
