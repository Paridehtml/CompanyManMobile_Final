const express = require('express');
const router = express.Router();
const Supplier = require('../models/SupplierModel');
const auth = require('../middleware/auth');

router.use(auth);

// @route   GET /api/suppliers
// @desc    Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    res.json({ success: true, count: suppliers.length, data: suppliers });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error fetching suppliers' });
  }
});

// @route   POST /api/suppliers
// @desc    Add a new supplier
router.post('/', async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(400).json({ success: false, msg: 'Failed to add supplier' });
  }
});

module.exports = router;