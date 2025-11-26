const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Menu = require('../models/MenuModel');
const Inventory = require('../models/inventoryModel');
const Order = require('../models/OrderModel');
const Counter = require('../models/CounterModel');
const mongoose = require('mongoose');

async function getNextOrderNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'orderNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true } 
  );
  if (counter.seq === 1) { 
    counter.seq = 1001;
    await counter.save();
  }
  return counter.seq;
}

const getMenuFoodCost = async (menuId) => {
  const menu = await Menu.findById(menuId);
  if (!menu) return { foodCost: 0, missingCostData: true };

  let totalCost = 0;
  let missingCostData = false;

  for (const item of menu.recipe) {
    const inventoryItem = await Inventory.findById(item.inventoryItem);
    if (!inventoryItem) {
      missingCostData = true;
      continue;
    }

    const { purchasePrice, purchaseUnit, purchaseQuantity, unit: stockingUnit } = inventoryItem;

    if (purchasePrice === null || purchasePrice < 0 || !purchaseQuantity) {
      missingCostData = true;
      continue;
    }

    const pricePerPurchaseUnit = purchasePrice / purchaseQuantity;
    const getBaseUnit = (unit) => {
      if (unit === 'kg') return 1000; if (unit === 'g') return 1;
      if (unit === 'l') return 1000; if (unit === 'ml') return 1;
      if (unit === 'unit') return 1;
      return 1;
    };

    const massUnits = ['g', 'kg'];
    const volUnits = ['ml', 'l'];
    if ((massUnits.includes(purchaseUnit) && volUnits.includes(stockingUnit)) ||
        (volUnits.includes(purchaseUnit) && massUnits.includes(stockingUnit))) {
       missingCostData = true; continue;
    }

    const purchaseUnitsInBase = getBaseUnit(purchaseUnit);
    const stockingUnitsInBase = getBaseUnit(stockingUnit);
    const conversionRatio = purchaseUnitsInBase / stockingUnitsInBase;
    
    let pricePerStockUnit;
    if (purchaseUnit === 'unit' && stockingUnit === 'unit') {
        pricePerStockUnit = pricePerPurchaseUnit;
    } else {
        pricePerStockUnit = pricePerPurchaseUnit / conversionRatio;
    }

    const recipeUnit = item.unit;
    const requiredQty = item.quantityRequired;
    
    if ((massUnits.includes(stockingUnit) && !massUnits.includes(recipeUnit)) ||
        (volUnits.includes(stockingUnit) && !volUnits.includes(recipeUnit)) ||
        (stockingUnit === 'unit' && recipeUnit !== 'unit')) {
         missingCostData = true; continue;
    }

    const recipeUnitInBase = getBaseUnit(recipeUnit);
    const stockingUnitInBaseFinal = getBaseUnit(stockingUnit);
    const finalConversion = recipeUnitInBase / stockingUnitInBaseFinal;
    const ingredientCost = pricePerStockUnit * (requiredQty * finalConversion);
    
    totalCost += ingredientCost;
  }
  return { foodCost: totalCost, missingCostData };
};

const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied. Admin/Manager required.' });
  }
};

const getDateRange = (query) => {
  const { period, startDate, endDate } = query;
  const now = new Date();
  let gte; 
  let lt = new Date(now); 
  lt.setHours(23, 59, 59, 999); 
  if (period === 'custom' && startDate && endDate) {
    gte = new Date(startDate);
    gte.setHours(0, 0, 0, 0); 
    lt = new Date(endDate);
    lt.setHours(23, 59, 59, 999); 
    return { $gte: gte, $lt: lt };
  }
  switch (period) {
    case 'last_7_days':
      gte = new Date(now); gte.setDate(gte.getDate() - 7); gte.setHours(0, 0, 0, 0);
      break;
    case 'this_month':
      gte = new Date(now.getFullYear(), now.getMonth(), 1); gte.setHours(0, 0, 0, 0);
      break;
    case 'this_year':
      gte = new Date(now.getFullYear(), 0, 1); gte.setHours(0, 0, 0, 0);
      break;
    default:
      gte = new Date(now); gte.setHours(0, 0, 0, 0);
      break;
  }
  return { $gte: gte, $lt: lt };
};

router.use(auth);

router.post('/', async (req, res) => {
  const { dishIds } = req.body; 
  if (!dishIds || !Array.isArray(dishIds) || dishIds.length === 0) {
    return res.status(400).json({ success: false, msg: 'dishIds array is required.' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let totalAmount = 0;
    const updateOperations = [];
    const orderItems = []; 
    const ingredientDeductionMap = new Map();
    for (const dishId of dishIds) {
      const dish = await Menu.findById(dishId).session(session);
      if (!dish) throw new Error(`Dish with ID ${dishId} not found`);
      totalAmount += dish.price;
      orderItems.push({ dishId: dish._id, dishName: dish.name, price: dish.price });
      for (const ingredient of dish.recipe) {
        const itemId = ingredient.inventoryItem.toString();
        const currentNeeded = ingredientDeductionMap.get(itemId) || 0;
        ingredientDeductionMap.set(itemId, currentNeeded + ingredient.quantityRequired);
      }
    }
    for (const [itemId, totalQuantityNeeded] of ingredientDeductionMap.entries()) {
      const item = await Inventory.findById(itemId).session(session);
      if (!item) throw new Error(`An ingredient (ID: ${itemId}) was not found in inventory.`);
      if (item.quantity < totalQuantityNeeded) {
        throw new Error(`Not enough ${item.name} in stock. Need ${totalQuantityNeeded}, have ${item.quantity}.`);
      }
      updateOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(itemId) },
          update: { $inc: { quantity: -totalQuantityNeeded } }
        }
      });
    }
    const newOrderNum = await getNextOrderNumber();
    const newOrder = new Order({
      orderNumber: newOrderNum,
      items: orderItems,
      totalAmount: totalAmount,
      soldBy: req.user.id
    });
    if (updateOperations.length > 0) {
      await Inventory.bulkWrite(updateOperations, { session });
    }
    await newOrder.save({ session }); 
    await session.commitTransaction();
    session.endSession();
    res.json({ success: true, msg: 'Order recorded.', total: totalAmount });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error processing order:', err);
    res.status(400).json({ success: false, msg: err.message });
  }
});

router.get('/summary', isManagerOrAdmin, async (req, res) => {
  try {
    const dateRange = getDateRange(req.query);
    
    const stats = await Order.aggregate([
      { $match: { createdAt: dateRange } }, 
      { $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 }
      }}
    ]);

    const bestSeller = await Order.aggregate([
      { $match: { createdAt: dateRange } },
      { $unwind: "$items" },
      { 
        $lookup: {
          from: 'menus',
          localField: 'items.dishId',
          foreignField: '_id',
          as: 'menuItemDetails'
        }
      },
      { $unwind: "$menuItemDetails" },
      { $match: { "menuItemDetails.category": { $ne: 'Drinks' } } },
      { 
        $group: {
          _id: "$items.dishId",
          dishName: { $first: "$items.dishName" },
          count: { $sum: 1 },
          price: { $first: "$items.price" }
      }},
      { $sort: { count: -1, price: -1 }},
      { $limit: 1 }
    ]);

    const allOrdersInPeriod = await Order.find({ createdAt: dateRange });
    
    let totalPeriodCost = 0;
    const dishCostCache = new Map(); 

    for (const order of allOrdersInPeriod) {
        for (const item of order.items) {
            const dishId = item.dishId.toString();
            
            if (!dishCostCache.has(dishId)) {
                const { foodCost } = await getMenuFoodCost(dishId);
                dishCostCache.set(dishId, foodCost);
            }
            
            totalPeriodCost += dishCostCache.get(dishId);
        }
    }

    const revenue = stats[0]?.revenue || 0;
    const periodProfit = revenue - totalPeriodCost;
    const periodMargin = revenue > 0 ? (periodProfit / revenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        periodRevenue: revenue,
        totalSalesForPeriod: stats[0]?.count || 0,
        periodProfit: periodProfit, 
        periodMargin: periodMargin,
        bestSellingDish: bestSeller[0]?.dishName || "N/A",
        bestSellingDishCount: bestSeller[0]?.count || 0,
        bestSellingDishId: bestSeller[0]?._id || null
      }
    });
  } catch (err) {
    console.error('Error fetching sales summary:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

router.get('/', isManagerOrAdmin, async (req, res) => {
  try {
    const dateRange = getDateRange(req.query);
    const orders = await Order.find({ createdAt: dateRange })
      .sort({ orderNumber: -1 })
      .populate('soldBy', 'name'); 
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

router.get('/order/:id/cost', isManagerOrAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, msg: 'Order not found' });

    let totalOrderFoodCost = 0;
    let anyDataMissing = false;

    for (const item of order.items) {
      try {
        const { foodCost, missingCostData } = await getMenuFoodCost(item.dishId);
        if (missingCostData) anyDataMissing = true;
        totalOrderFoodCost += foodCost;
      } catch (err) { anyDataMissing = true; }
    }
    const totalProfit = order.totalAmount - totalOrderFoodCost;

    res.json({
      success: true,
      data: {
        orderId: order._id,
        totalAmount: order.totalAmount,
        totalFoodCost: parseFloat(totalOrderFoodCost.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        missingCostData: anyDataMissing,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;