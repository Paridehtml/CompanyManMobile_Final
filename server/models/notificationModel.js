const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['marketing_suggestion', 'low_stock', 'shift_update', 'system'] 
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    default: null
  },
  status: {
    type: String,
    enum: ['read', 'unread'],
    default: 'unread'
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);