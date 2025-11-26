const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'Token missing' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded && decoded.user) {
      req.user = decoded.user;
    } else {
      throw new Error('Token payload is invalid');
    }

    next();
  } catch (err) {
    console.error('Token is invalid:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};