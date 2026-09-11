import { VisitLog } from '../models/VisitLog.js';
import { Shop } from '../models/Shop.js';
import { calculateDistanceMeters, GEOFENCE_RADIUS_METERS } from '../utils/distance.js';

// @desc    Record a salesman visit with geofence and anti-fraud verification
// @route   POST /api/visits/check-in
export const checkInVisit = async (req, res) => {
  try {
    const {
      shopId,
      latitude,
      longitude,
      isMockLocationDetected,
      photoProofUrl,
      purpose,
      notes,
    } = req.body;

    const salesmanId = req.user._id;

    if (!shopId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Shop ID and live GPS coordinates (latitude, longitude) are required',
      });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const shopLat = shop.location?.latitude;
    const shopLng = shop.location?.longitude;

    let distanceMeters = 0;
    let isGeofenceVerified = false;

    if (shopLat && shopLng) {
      distanceMeters = calculateDistanceMeters(latitude, longitude, shopLat, shopLng);
      // Valid if within 150 meters
      isGeofenceVerified = distanceMeters <= GEOFENCE_RADIUS_METERS;
    }

    const visit = await VisitLog.create({
      salesman: salesmanId,
      shop: shop._id,
      location: { latitude, longitude },
      distanceMeters,
      isGeofenceVerified,
      isMockLocationDetected: !!isMockLocationDetected,
      photoProofUrl: photoProofUrl || '',
      purpose: purpose || 'ORDER_AND_COLLECTION',
      notes: notes || '',
      checkInTime: new Date(),
    });

    // Update shop last visited timestamp
    shop.lastVisitedAt = new Date();
    await shop.save();

    const populatedVisit = await VisitLog.findById(visit._id)
      .populate('shop', 'shopName ownerName phone city address')
      .populate('salesman', 'name phone');

    res.status(201).json({
      success: true,
      visit: populatedVisit,
      verification: {
        isGeofenceVerified,
        distanceMeters,
        thresholdMeters: GEOFENCE_RADIUS_METERS,
        status: isGeofenceVerified ? 'VERIFIED_ON_SITE' : 'OUTSIDE_GEOFENCE_WARNING',
        isMockLocationDetected: !!isMockLocationDetected,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get visit logs (Admin / Warehouse auditing)
// @route   GET /api/visits
export const getVisits = async (req, res) => {
  try {
    const { salesmanId, shopId, verifiedOnly, date } = req.query;
    const filter = {};

    if (salesmanId) filter.salesman = salesmanId;
    if (shopId) filter.shop = shopId;
    if (verifiedOnly === 'true') filter.isGeofenceVerified = true;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.checkInTime = { $gte: start, $lte: end };
    }

    const visits = await VisitLog.find(filter)
      .populate('shop', 'shopName ownerName city address location')
      .populate('salesman', 'name phone')
      .sort({ checkInTime: -1 });

    res.json({ success: true, count: visits.length, visits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
