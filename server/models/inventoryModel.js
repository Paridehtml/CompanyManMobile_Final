const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Inventory item must have a name'],
    trim: true,
  },
  sku: { 
    type: String, 
    unique: true, 
    required: [true, 'SKU (Stock Keeping Unit) is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },

  unit: {
    type: String,
    required: [true, 'Stocking unit of measure is required (g, ml, unit)'],
    enum: ['g', 'kg', 'ml', 'l', 'unit'],
    default: 'unit'
  },

  purchasePrice: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0,
  },

  purchaseUnit: {
    type: String,
    required: [true, 'Purchase unit is required'],
    enum: ['g', 'kg', 'ml', 'l', 'unit'],
    default: 'unit'
  },

  purchaseQuantity: {
    type: Number,
    min: [0.001, 'Purchase quantity must be positive'],
    default: 1
  },

  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: false,
  },
  dateReceived: {
    type: Date,
    default: Date.now,
  },
  expiresInDays: {
    type: Number,
    min: 0,
    default: null
  },
  
}, {
  timestamps: true 
});

module.exports = mongoose.model('Inventory', inventorySchema);