const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wasteSchema = new Schema({
  inventoryItem: {
    type: Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    enum: ['Expired', 'Damaged', 'Cooked wrong', 'Dropped', 'Other'],
    default: 'Other'
  },
  loggedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('Waste', wasteSchema);