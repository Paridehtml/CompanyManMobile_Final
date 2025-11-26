const User = require('../models/userModel');
const Shift = require('../models/Shifts'); 
const Notification = require('../models/notificationModel');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    let users;
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      users = await User.find().select('-password');
    } else {
      users = await User.find({ _id: req.user.id }).select('-password');
    }
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single user
exports.getUserById = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && !(req.user.role === 'admin' || req.user.role === 'manager')) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Get User By ID Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
       return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    if (req.body.position) user.position = req.body.position;
    if (req.body.phone) user.phone = req.body.phone;

    if (req.body.password) {
      user.password = req.body.password;
    }
    const updatedUser = await user.save();
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.id;
  console.log(`[Controller] Received delete request for user ID: ${userId}`);

  try {
    if (req.user.role !== 'admin') {
      console.log("[Controller] Delete failed: Requestor is not admin");
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }
    
    if (req.user.id === userId) {
       console.log("[Controller] Delete failed: User tried to delete self");
       return res.status(400).json({ success: false, error: 'You cannot delete your own account.' });
    }

    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const shiftResult = await Shift.deleteMany({ staffId: userId, date: { $gte: today } });
      console.log(`[Controller] Cleaned up ${shiftResult.deletedCount} future shifts`);
    } catch (shiftErr) {
      console.warn("[Controller] Warning: Could not cleanup shifts", shiftErr.message);
    }

    try {
      const notifResult = await Notification.deleteMany({ targetId: userId });
      console.log(`[Controller] Cleaned up ${notifResult.deletedCount} notifications`);
    } catch (notifErr) {
      console.warn("[Controller] Warning: Could not cleanup notifications", notifErr.message);
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      console.log("[Controller] Delete failed: User ID not found in DB");
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`[Controller] User ${userId} successfully deleted`);
    res.status(200).json({ success: true, data: {} });

  } catch (error) {
    console.error("[Controller] CRITICAL DELETE ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};