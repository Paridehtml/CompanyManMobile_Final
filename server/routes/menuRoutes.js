const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Menu = require('../models/MenuModel');
const Inventory = require('../models/inventoryModel');

const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied. Admin/Manager required.' });
  }
};

// @route   GET /api/menu
// @desc    Get all menu items and basic inventory data
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const dishes = await Menu.find().sort({ category: 1, name: 1 });
    const ingredients = await Inventory.find().select('name sku unit');
    res.json({ success: true, data: { dishes, ingredients } });
  } catch (err) {
    console.error('Error fetching menu data:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

// @route   POST /api/menu
// @desc    Create a new menu item
// @access  Private (Manager/Admin)
router.post('/', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const newDish = new Menu(req.body);
    await newDish.save();
    res.status(201).json({ success: true, data: newDish });
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(400).json({ success: false, msg: 'Invalid data. Dish name may be taken.' });
  }
});

// @route   PUT /api/menu/:id
// @desc    Update a menu item
// @access  Private (Manager/Admin)
router.put('/:id', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const updatedDish = await Menu.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedDish) {
      return res.status(404).json({ success: false, msg: 'Dish not found' });
    }
    res.json({ success: true, data: updatedDish });
  } catch (err) {
    console.error('Error updating menu item:', err);
    res.status(400).json({ success: false, msg: 'Invalid data.' });
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete a menu item
// @access  Private (Manager/Admin)
router.delete('/:id', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const deletedDish = await Menu.findByIdAndDelete(req.params.id);
    if (!deletedDish) {
      return res.status(404).json({ success: false, msg: 'Dish not found' });
    }
    res.json({ success: true, data: {} });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

// @route   GET /api/menu/:id/cost
// @desc    Get the calculated food cost for a menu item
// @access  Private (Manager/Admin)
router.get('/:id/cost', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ success: false, msg: 'Menu item not found' });
    }

    let totalCost = 0;
    let costBreakdown = [];
    let missingCostData = false;

    // Helper for unit conversion
    const getBaseUnit = (unit) => {
      if (unit === 'kg' || unit === 'l') return 1000;
      return 1; // g, ml, unit
    };

    const massUnits = ['g', 'kg'];
    const volUnits = ['ml', 'l'];

    for (const item of menu.recipe) {
      const inventoryItem = await Inventory.findById(item.inventoryItem);
      
      if (!inventoryItem) {
        // Skip if ingredient deleted, but flag it
        missingCostData = true;
        continue;
      }

      const { purchasePrice, purchaseUnit, purchaseQuantity, unit: stockingUnit } = inventoryItem;

      if (!purchasePrice || purchasePrice < 0 || !purchaseQuantity) {
        missingCostData = true;
        costBreakdown.push({ name: item.name, cost: 0, msg: 'Missing cost data' });
        continue;
      }

      // Check unit compatibility
      if (
        (massUnits.includes(purchaseUnit) && volUnits.includes(stockingUnit)) ||
        (volUnits.includes(purchaseUnit) && massUnits.includes(stockingUnit))
      ) {
        throw new Error(`Incompatible units for ${inventoryItem.name}`);
      }

      // Calculate base cost per smallest unit (g/ml/unit)
      const pricePerPurchaseUnit = purchasePrice / purchaseQuantity;
      const purchaseToBase = getBaseUnit(purchaseUnit);
      const stockingToBase = getBaseUnit(stockingUnit);
      const conversionRatio = purchaseToBase / stockingToBase;

      let pricePerStockUnit = (purchaseUnit === 'unit' && stockingUnit === 'unit') 
        ? pricePerPurchaseUnit 
        : pricePerPurchaseUnit / conversionRatio;

      // Calculate final cost based on recipe requirement
      const recipeUnit = item.unit;
      const requiredQty = item.quantityRequired;
      const recipeToBase = getBaseUnit(recipeUnit);
      const finalConversion = recipeToBase / stockingToBase;
      
      const ingredientCost = pricePerStockUnit * (requiredQty * finalConversion);
      
      totalCost += ingredientCost;
      costBreakdown.push({ name: item.name, cost: ingredientCost });
    }

    const profit = menu.price - totalCost;
    const profitMargin = menu.price > 0 ? (profit / menu.price) * 100 : 0;

    res.json({
      success: true,
      data: {
        menuId: menu._id,
        name: menu.name,
        price: menu.price,
        foodCost: parseFloat(totalCost.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        missingCostData,
        breakdown: costBreakdown,
      }
    });

  } catch (err) {
    console.error('Error calculating food cost:', err.message);
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;