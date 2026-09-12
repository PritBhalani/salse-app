import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'wholesale_secret_key_2026', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { phone, password, deviceId } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone and password' });
    }

    const user = await User.findOne({ phone }).populate('shopId');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    // Handle Salesman Device Binding
    if (user.role === 'SALESMAN' && deviceId) {
      if (!user.deviceId) {
        // First login binds the device
        user.deviceId = deviceId;
        await user.save();
      } else if (user.deviceId !== deviceId) {
        return res.status(403).json({
          success: false,
          message: 'Device mismatch. Bound to another registered device. Contact Admin to reset.',
        });
      }
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
        cashInHand: user.cashInHand,
        activeCities: user.activeCities,
      },
    });
  } catch (error) {
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
    const { role } = req.query;
    const filter = role ? { role } : {};
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
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
