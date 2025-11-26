const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ingredientSchema = new Schema({
  inventoryItem: { 
    type: Schema.Types.ObjectId, 
    ref: 'Inventory',
    required: true 
  },
  quantityRequired: {
    type: Number,
    required: true,
  },
  name: { type: String, required: true }, 

  unit: { 
    type: String,
    required: true,
    enum: ['g', 'kg', 'ml', 'l', 'unit']
  }

});

const menuSchema = new Schema({
  name: {
    type: String, 
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  recipe: [ingredientSchema] 
}, {
  timestamps: true
});

module.exports = mongoose.model('Menu', menuSchema);