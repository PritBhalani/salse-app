import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wholesale_secret_key_2026');

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      // Check device ID binding for SALESMAN if present
      if (req.user.role === 'SALESMAN' && req.headers['x-device-id']) {
        const clientDeviceId = req.headers['x-device-id'];
        if (req.user.deviceId && req.user.deviceId !== clientDeviceId) {
          return res.status(403).json({
            success: false,
            message: 'Device mismatch. This account is bound to another registered device.',
          });
        }
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user ? req.user.role : 'None'}) is not authorized to access this resource`,
      });
    }
    next();
  };
};
