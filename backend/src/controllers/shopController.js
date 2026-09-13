import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { calculateDistanceMeters } from '../utils/distance.js';

// @desc    Get all shops (with filters)
// @route   GET /api/shops
export const getShops = async (req, res) => {
  try {
    const { city, routeId, search, salesmanLat, salesmanLng } = req.query;
    let filter = { isActive: true };

    if (city) {
      filter.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }
    if (routeId) {
      filter.routeId = routeId;
    }
    if (search) {
      filter.$or = [
        { shopName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    let shops = await Shop.find(filter).populate('routeId').sort({ shopName: 1 });

    // Calculate distance if salesman coordinates are provided
    if (salesmanLat && salesmanLng) {
      const lat = parseFloat(salesmanLat);
      const lng = parseFloat(salesmanLng);
      shops = shops.map((s) => {
        const shopObj = s.toObject();
        if (s.location && s.location.latitude && s.location.longitude) {
          shopObj.distanceMeters = calculateDistanceMeters(
            lat,
            lng,
            s.location.latitude,
            s.location.longitude
          );
        } else {
          shopObj.distanceMeters = null;
        }
        return shopObj;
      });
      // Sort nearest first
      shops.sort((a, b) => (a.distanceMeters ?? 9999999) - (b.distanceMeters ?? 9999999));
    }

    res.json({ success: true, count: shops.length, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single shop with full ledger and order history
// @route   GET /api/shops/:id
export const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('routeId').populate('onboardedBy', 'name phone');
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Fetch order history (split into GST and Non-GST)
    const orders = await Order.find({ shop: shop._id })
      .populate('salesman', 'name')
      .sort({ createdAt: -1 });

    // Fetch payment collections
    const payments = await Payment.find({ shop: shop._id })
      .populate('salesman', 'name')
      .sort({ collectedAt: -1 });

    // GST stats
    const gstOrders = orders.filter((o) => o.billType === 'GST');
    const nonGstOrders = orders.filter((o) => o.billType === 'NON_GST');
    const gstPayments = payments.filter((p) => p.billType === 'GST');
    const nonGstPayments = payments.filter((p) => p.billType === 'NON_GST');

    res.json({
      success: true,
      shop,
      stats: {
        totalGstOrders: gstOrders.length,
        totalNonGstOrders: nonGstOrders.length,
        totalGstPayments: gstPayments.length,
        totalNonGstPayments: nonGstPayments.length,
      },
      orders,
      payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create/Onboard a new shop & generate shop owner login credentials
// @route   POST /api/shops
export const createShop = async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      phone,
      altPhone,
      city,
      address,
      latitude,
      longitude,
      routeId,
      gstNumber,
      creditLimit,
      ownerPassword,
    } = req.body;

    const existingShop = await Shop.findOne({ phone });
    if (existingShop) {
      return res.status(400).json({
        success: false,
        message: 'A shop with this primary phone number already exists',
      });
    }

    const shop = await Shop.create({
      shopName,
      ownerName,
      phone,
      altPhone,
      city,
      address,
      location: {
        latitude: parseFloat(latitude) || 22.812,
        longitude: parseFloat(longitude) || 70.8236,
      },
      routeId: routeId || null,
      gstNumber,
      creditLimit: creditLimit || 150000,
      onboardedBy: req.user._id,
    });

    // Auto-create Shop Owner user account so they can log in via mobile app
    const initialPassword = ownerPassword || phone.slice(-6); // default last 6 digits of phone
    const existingUser = await User.findOne({ phone });
    let createdUser = null;

    if (!existingUser) {
      createdUser = await User.create({
        name: ownerName,
        phone,
        password: initialPassword,
        role: 'SHOP_OWNER',
        shopId: shop._id,
      });
    }

    res.status(201).json({
      success: true,
      shop,
      credentials: {
        phone,
        password: initialPassword,
        note: 'Share these credentials with the shop owner for their mobile app login.',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update shop details
// @route   PUT /api/shops/:id
export const updateShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    res.json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete shop (soft delete)
// @route   DELETE /api/shops/:id
export const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Also deactivate the shop owner account so they can no longer log in
    try {
      await User.updateMany({ shopId: shop._id }, { $set: { isActive: false } });
    } catch (uErr) {
      console.warn('Could not deactivate shop user account:', uErr.message);
    }

    res.json({
      success: true,
      message: `Shop "${shop.shopName}" deleted successfully`,
      shopName: shop.shopName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
