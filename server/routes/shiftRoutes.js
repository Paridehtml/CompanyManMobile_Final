const express = require('express');
const router = express.Router();
const Shift = require('../models/Shifts');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel'); 
const auth = require('../middleware/auth');

router.use(auth);

const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied. Admin/Manager required.' });
  }
};

// @route   GET /api/shifts/next-upcoming
// @desc    Get the single next upcoming shift for the logged-in user
// @access  Private
router.get('/next-upcoming', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const shifts = await Shift.find({ 
      staffId: req.user.id, 
      date: { $gte: today } 
    }).sort({ date: 'asc' });

    let nextShift = null;
    const now = new Date();

    for (const shift of shifts) {
      if (!shift.endTime) continue; 
      
      const [hours, minutes] = shift.endTime.split(':').map(Number);
      const shiftEndDate = new Date(shift.date);
      shiftEndDate.setHours(hours, minutes, 0, 0);
      
      if (shiftEndDate > now) { 
        nextShift = shift; 
        break; 
      }
    }
    
    res.json({ data: nextShift || null });
  } catch (err) { 
    res.status(500).json({ error: 'Error fetching shift' }); 
  }
});

// @route   GET /api/shifts
// @desc    Get shifts based on filters (Manager sees all, Employee sees own)
// @access  Private
router.get('/', async (req, res) => {
  const { startDate, endDate, staffId } = req.query;
  
  try {
    let query = {};
    
    // Access Control for Query
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      if (staffId) query.staffId = staffId;
    } else {
      query.staffId = req.user.id;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lt: end };
    } else {
      // Return empty if no range specified to prevent over-fetching
      return res.json({ data: [] });
    }

    const shifts = await Shift.find(query).populate('staffId', 'name email');
    res.json({ data: shifts });

  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ error: 'Error fetching shifts' });
  }
});

// @route   POST /api/shifts
// @desc    Create a new shift and notify staff/admins
// @access  Private (Manager/Admin)
router.post('/', isManagerOrAdmin, async (req, res) => {
  try {
    const shift = new Shift(req.body);
    await shift.save();
    
    const shiftDate = new Date(shift.date).toISOString().split('T')[0];
    
    // Fetch names for notification context
    let assignerName = 'a Manager';
    let staffName = 'Staff Member';

    try {
        const assigner = await User.findById(req.user.id);
        if (assigner) assignerName = assigner.name;

        const staffUser = await User.findById(shift.staffId);
        if (staffUser) staffName = staffUser.name;
    } catch (uErr) { 
        console.error("Could not fetch names for notifications", uErr); 
    }

    // Notify the assigned Employee
    try {
        await Notification.create({
            type: 'shift_update',
            title: 'New Shift Assigned',
            message: `You have been assigned a ${shift.shiftType} shift on ${shiftDate} from ${shift.startTime} to ${shift.endTime} by ${assignerName}.`,
            targetId: shift.staffId,
            status: 'unread'
        });
    } catch (nErr) { 
        console.error("Employee notification failed", nErr); 
    }

    // Notify Admins (Activity Log)
    try {
        const admins = await User.find({ role: { $regex: /^admin$/i } });
        const notesText = shift.notes ? ` Notes: "${shift.notes}"` : '';

        for (const admin of admins) {
            await Notification.create({
                type: 'shift_update', 
                title: 'Activity Log',
                message: `${assignerName} assigned a shift to ${staffName} on ${shiftDate} (${shift.startTime}-${shift.endTime}).${notesText}`,
                targetId: admin._id,
                status: 'unread'
            });
        }
    } catch (adminErr) { 
        console.error("Admin notification failed", adminErr); 
    }

    res.status(201).json({ data: shift });
  } catch (err) {
    console.error('Invalid shift data:', err);
    res.status(400).json({ error: 'Invalid shift data' });
  }
});

// @route   PUT /api/shifts/:id
// @desc    Update a shift and notify staff/admins
// @access  Private (Manager/Admin)
router.put('/:id', isManagerOrAdmin, async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (!shift) {
        return res.status(404).json({ error: 'Shift not found' });
    }
    
    const shiftDate = new Date(shift.date).toISOString().split('T')[0];

    // Fetch names for notification context
    let assignerName = 'a Manager';
    let staffName = 'Staff Member';

    try {
        const assigner = await User.findById(req.user.id);
        if (assigner) assignerName = assigner.name;

        const staffUser = await User.findById(shift.staffId);
        if (staffUser) staffName = staffUser.name;
    } catch (uErr) { 
        console.error("Could not fetch names for notifications", uErr); 
    }

    // Notify the assigned Employee
    try {
        await Notification.create({
            type: 'shift_update',
            title: 'Shift Updated',
            message: `Your ${shift.shiftType} shift on ${shiftDate} (from ${shift.startTime} to ${shift.endTime}) has been updated by ${assignerName}.`,
            targetId: shift.staffId,
            status: 'unread'
        });
    } catch (nErr) { 
        console.error("Employee notification failed", nErr); 
    }

    // Notify Admins (Activity Log)
    try {
        const admins = await User.find({ role: { $regex: /^admin$/i } });
        const notesText = shift.notes ? ` Notes: "${shift.notes}"` : '';

        for (const admin of admins) {
            await Notification.create({
                type: 'shift_update',
                title: 'Activity Log',
                message: `${assignerName} updated the shift for ${staffName} on ${shiftDate} (${shift.startTime}-${shift.endTime}).${notesText}`,
                targetId: admin._id,
                status: 'unread'
            });
        }
    } catch (adminErr) { 
        console.error("Admin notification failed", adminErr); 
    }

    res.json({ data: shift });
  } catch (err) {
    console.error('Invalid shift data:', err);
    res.status(400).json({ error: 'Invalid shift data' });
  }
});

// @route   DELETE /api/shifts/:id
// @desc    Delete a shift
// @access  Private (Manager/Admin)
router.delete('/:id', isManagerOrAdmin, async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    res.json({ message: 'Shift deleted' });
  } catch (err) {
    console.error('Error deleting shift:', err);
    res.status(500).json({ error: 'Error deleting shift' });
  }
});

module.exports = router;