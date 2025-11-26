const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shiftSchema = new Schema({
  staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  startTime: { type: String },
  endTime: { type: String },
  shiftType: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
  notes: { type: String },
  notification: { type: String },
}, {
  timestamps: true
});

module.exports = mongoose.model('Shift', shiftSchema);
