const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Inventory = require('../models/inventoryModel');
const Waste = require('../models/WasteModel');
const mongoose = require('mongoose');

// Middleware to protect all routes
const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied. Admin/Manager required.' });
  }
};
router.use(auth, isManagerOrAdmin);

// @route   POST /api/waste
// @desc    Log a new waste item and deduct from inventory
router.post('/', async (req, res) => {
  const { inventoryItemId, quantity, reason } = req.body;
  
  if (!inventoryItemId || !quantity || !reason) {
    return res.status(400).json({ success: false, msg: 'All fields are required.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const item = await Inventory.findById(inventoryItemId).session(session);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    if (item.quantity < quantity) {
      throw new Error(`Not enough stock to log waste. On hand: ${item.quantity}, Wasting: ${quantity}`);
    }

    item.quantity -= quantity;
    await item.save({ session });

    const wasteLog = new Waste({
      inventoryItem: item._id,
      itemName: item.name,
      quantity,
      unit: item.unit,
      reason,
      loggedBy: req.user.id
    });
    await wasteLog.save({ session });

    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({ success: true, data: wasteLog });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error logging waste:', err);
    res.status(400).json({ success: false, msg: err.message });
  }
});

// @route   GET /api/waste
// @desc    Get all waste logs
router.get('/', async (req, res) => {
  try {
    const wasteLogs = await Waste.find()
      .sort({ createdAt: -1 })
      .populate('loggedBy', 'name');
    
    res.json({ success: true, data: wasteLogs });
  } catch (err) {
    console.error('Error fetching waste logs:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

module.exports = router;
