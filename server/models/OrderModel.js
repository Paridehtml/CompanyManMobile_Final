const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderItemSchema = new Schema({
  dishId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Menu',
    required: true 
  },
  dishName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
}, {
  _id: false
});

const orderSchema = new Schema({
  orderNumber: {
    type: Number,
    required: true,
    unique: true
  },
  
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  soldBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('Order', orderSchema);