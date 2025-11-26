const express = require('express');
const router = express.Router();
const Inventory = require('../models/inventoryModel');
const auth = require('../middleware/auth');

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const items = await Inventory.find({})
      .populate('supplier', 'name')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, count: items.length, data: items }); 
  } catch (err) {
    console.error('Error fetching inventory:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST /api/inventory
// @desc    Add a new inventory item
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const item = new Inventory(req.body);
    await item.save();
    res.status(201).json({ success: true, data: item }); 
  
  } catch (err) {
    console.error('Failed to add item:', err);
    res.status(400).json({
      success: false,
      msg: 'Validation failed or duplicate SKU',
      error: err.message
    });
  }
});

// @route   GET /api/inventory/:id
// @desc    Get a single inventory item by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).populate('supplier');

    if (!item) {
      return res.status(404).json({ success: false, msg: 'Item not found' });
    }
    res.json({ success: true, data: item }); 
  } catch (err) {
    console.error('Error fetching single item:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update an inventory item
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, msg: 'Item not found' });
    }
    res.json({ success: true, data: item }); 
  } catch (err) {
    console.error('Error updating item:', err.message);
    res.status(400).json({ success: false, msg: 'Update failed', error: err.message });
  }
});

// @route   DELETE /api/inventory/:id
// @desc    Delete an inventory item
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({ success: false, msg: 'Item not found' });
    }
    res.json({ success: true, msg: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting item:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;