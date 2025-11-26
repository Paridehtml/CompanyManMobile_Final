const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const User = require('../models/userModel');

router.route('/')
  .get(auth, getAllUsers)
  .post(auth, createUser);

// Get the current logged-in user's profile (protected)
// @route GET /api/users/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); 

    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });
    
    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin',
        phone: user.phone,
        position: user.position,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Error fetching profile:', err);

    res.status(500).json({ success: false, msg: 'Server Error fetching profile', error: err.message });
  }
});

// Update profile of current logged-in user (protected)
// @route PUT /api/users/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

    user.name = req.body.name ?? user.name;
    user.phone = req.body.phone ?? user.phone;
    user.position = req.body.position ?? user.position;
    user.avatar = req.body.avatar ?? user.avatar;

    await user.save();
    
    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin',
        phone: user.phone,
        position: user.position,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, msg: 'Profile update error', error: err.message });
  }
});

// Route: /api/users/:id (protected)
router.route('/:id')
  .get(auth, getUserById)
  .put(auth, updateUser)
  .delete(auth, deleteUser);

// Debug catch-all for unmatched routes
router.use((req, res) => {
  res.status(404).json({ msg: 'Unmatched route', method: req.method, url: req.originalUrl, body: req.body });
});

module.exports = router;
