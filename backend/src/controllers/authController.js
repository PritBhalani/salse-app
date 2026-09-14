import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { Route } from '../models/Route.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'wholesale_secret_key_2026', {
    expiresIn: '30d',
  });
};

// @desc    Switch operating role (Admin <-> Warehouse)
// @route   POST /api/auth/switch-role
export const switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'ADMIN' && role !== 'WAREHOUSE') {
      return res.status(400).json({ success: false, message: 'Invalid role for web portal' });
    }

    const targetUser = await User.findOne({ role, isActive: true }).sort({ createdAt: 1 });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: `No active ${role} account found` });
    }

    const token = generateToken(targetUser._id);
    res.json({
      success: true,
      token,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        phone: targetUser.phone,
        email: targetUser.email,
        role: targetUser.role,
        shopId: targetUser.shopId,
        deviceId: targetUser.deviceId,
        cashInHand: targetUser.cashInHand,
        activeCities: targetUser.activeCities,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Auth user & get token (supports Phone, Email, Username, or Role)
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const rawIdentifier = (req.body.phone || req.body.email || req.body.username || req.body.identifier || req.body.role || '').toString().trim();
    const password = (req.body.password || '').toString();
    const deviceId = req.body.deviceId;

    if (!rawIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone number or email, and password' });
    }

    const digitsOnly = rawIdentifier.replace(/[^0-9]/g, '');
    const last10Digits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    const queryOr = [
      { phone: rawIdentifier },
      { email: rawIdentifier.toLowerCase() },
      { name: new RegExp(`^${rawIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    ];

    if (rawIdentifier.toUpperCase() === 'ADMIN' || rawIdentifier.toUpperCase() === 'WAREHOUSE') {
      queryOr.push({ role: rawIdentifier.toUpperCase() });
    }

    if (digitsOnly) {
      queryOr.push({ phone: digitsOnly });
    }
    if (last10Digits && last10Digits !== digitsOnly) {
      queryOr.push({ phone: last10Digits });
    }

    const user = await User.findOne({ $or: queryOr }).populate('shopId');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone number/email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone number/email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact admin.' });
    }

    // Handle Salesman Device Binding (auto-binds/updates on valid login)
    if (user.role === 'SALESMAN' && deviceId) {
      user.deviceId = deviceId;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        deviceId: user.deviceId,
        cashInHand: user.cashInHand,
        activeCities: user.activeCities,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new user (Admin only)
// @route   POST /api/auth/users
export const createUser = async (req, res) => {
  try {
    const { name, phone, email, password, role, activeCities } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this phone number' });
    }

    const user = await User.create({
      name,
      phone,
      email,
      password,
      role: role || 'SALESMAN',
      activeCities: activeCities || [],
      isActive: true,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('shopId');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users / salesmen (Admin / Warehouse)
// @route   GET /api/auth/users
export const getUsers = async (req, res) => {
  try {
    const { role, includeInactive } = req.query;
    const filter = {};
    if (includeInactive !== 'true') {
      filter.isActive = { $ne: false };
    }
    if (role) {
      filter.role = role;
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset salesman device binding (Admin only)
// @route   PUT /api/auth/users/:id/reset-device
export const resetDevice = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.deviceId = null;
    await user.save();
    res.json({ success: true, message: `Device binding cleared for ${user.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user / salesman credentials (Admin only)
// @route   PUT /api/auth/users/:id
export const updateUser = async (req, res) => {
  try {
    const { name, phone, password, role, activeCities, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (activeCities) user.activeCities = activeCities;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) {
      user.password = password; // Pre-save / wrapDoc hashes if changed
    }

    await user.save();
    res.json({ success: true, message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Deactivate user / salesman (Admin only)
// @route   DELETE /api/auth/users/:id
export const deleteUser = async (req, res) => {
  try {
    // Prevent deleting logged-in user
    if (req.user && req.user._id && req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own logged-in account',
      });
    }

    const { permanent } = req.query;
    let user;
    if (permanent === 'true') {
      user = await User.findByIdAndDelete(req.params.id);
    } else {
      user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Unassign salesman from any routes
    try {
      await Route.updateMany({ assignedSalesman: user._id }, { $set: { assignedSalesman: null } });
    } catch (rErr) {
      console.warn('Could not unassign salesman from routes:', rErr.message);
    }

    res.json({
      success: true,
      message: `Salesman "${user.name}" deleted successfully`,
      userName: user.name,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
