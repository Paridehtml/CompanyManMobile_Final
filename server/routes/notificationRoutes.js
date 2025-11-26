const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/notificationModel');

router.use(auth);

// @route   GET /api/notifications/my
// @desc    Get notifications for the logged-in user ONLY
router.get('/my', async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { targetId: req.user.id },
        { targetId: null }
      ]
    }).sort({ createdAt: -1 }).limit(20);

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    if (notification.targetId && notification.targetId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    notification.status = 'read';
    await notification.save();
    
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    if (notification.targetId && notification.targetId.toString() !== req.user.id) {
        if (req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized to delete this notification' });
        }
    }

    await Notification.deleteOne({ _id: req.params.id });
    res.json({ success: true, msg: 'Notification removed' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;