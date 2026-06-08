const mongoose = require('mongoose');

const EVENT_TYPES = [
  'created',         // new card added
  'moved',           // column changed
  'updated',         // text / priority / dueDate / subtasks changed
  'subtask_toggled', // a subtask was checked or unchecked
  'deleted',         // card removed
  'cleared_done',    // bulk-cleared done column
];

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: EVENT_TYPES },
    cardId: { type: mongoose.Schema.Types.ObjectId, default: null },
    cardText: { type: String, default: '' }, // snapshot, so deleted cards still readable
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
