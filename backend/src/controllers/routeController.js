import { Route } from '../models/Route.js';
import { Shop } from '../models/Shop.js';

// @desc    Get all routes with assigned salesmen and shop counts
// @route   GET /api/routes
export const getRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true })
      .populate('assignedSalesman', 'name phone activeCities')
      .sort({ name: 1 });

    const routesWithShopCount = await Promise.all(
      routes.map(async (route) => {
        const shopCount = await Shop.countDocuments({
          $or: [
            { routeId: route._id },
            { city: { $in: route.cities } }
          ],
          isActive: true,
        });
        const routeObj = route.toObject();
        routeObj.shopCount = shopCount;
        return routeObj;
      })
    );

    res.json({ success: true, count: routesWithShopCount.length, routes: routesWithShopCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single route with all shops in those cities
// @route   GET /api/routes/:id
export const getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).populate('assignedSalesman', 'name phone');
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    const shops = await Shop.find({
      $or: [
        { routeId: route._id },
        { city: { $in: route.cities } }
      ],
      isActive: true,
    }).sort({ shopName: 1 });

    res.json({ success: true, route, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get salesman's assigned routes for today / upcoming (Supports multiple beats)
// @route   GET /api/routes/my-route
export const getMyRoute = async (req, res) => {
  try {
    const salesmanId = req.user._id;
    // Find all routes assigned to this salesman
    const routes = await Route.find({
      assignedSalesman: salesmanId,
      isActive: true,
    }).sort({ name: 1 });

    if (!routes || routes.length === 0) {
      const cities = req.user.activeCities || [];
      const shops = await Shop.find({ city: { $in: cities }, isActive: true });
      return res.json({
        success: true,
        routes: [],
        route: null,
        cities,
        shops,
        message: 'No specific beat assigned. Displaying all shops in active cities.',
      });
    }

    // Determine today's day of week (e.g. Monday, Tuesday)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    // Pick today's scheduled route if matched, or the first assigned route
    const todaysRoute =
      routes.find((r) => r.scheduleDays && r.scheduleDays.includes(todayName)) || routes[0];

    const allCities = [...new Set(routes.flatMap((r) => r.cities || []))];

    const shops = await Shop.find({
      $or: [
        { routeId: todaysRoute._id },
        { city: { $in: todaysRoute.cities } }
      ],
      isActive: true,
    });

    res.json({
      success: true,
      routes,
      route: todaysRoute,
      cities: todaysRoute.cities,
      allAssignedCities: allCities,
      shops,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new multi-city route (Admin / Boss only)
// @route   POST /api/routes
export const createRoute = async (req, res) => {
  try {
    const { name, cities, assignedSalesman, scheduleDays, nextVisitDate, description } = req.body;

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Beat name is required' });
    }

    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingRoute = await Route.findOne({
      name: { $regex: `^${escapedName}$`, $options: 'i' },
      isActive: true,
    });

    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: `A beat with the name "${existingRoute.name}" already exists!`,
      });
    }

    const route = await Route.create({
      name: trimmedName,
      cities: Array.isArray(cities) ? cities : cities.split(',').map((c) => c.trim()).filter(Boolean),
      assignedSalesman: assignedSalesman || null,
      scheduleDays: scheduleDays || [],
      nextVisitDate: nextVisitDate || null,
      description,
    });

    res.status(201).json({ success: true, route });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update route (cities, salesman, schedule) (Admin / Boss only)
// @route   PUT /api/routes/:id
export const updateRoute = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.name) {
      const trimmedName = updateData.name.trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Beat name cannot be empty' });
      }

      const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingRoute = await Route.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: `^${escapedName}$`, $options: 'i' },
        isActive: true,
      });

      if (existingRoute) {
        return res.status(400).json({
          success: false,
          message: `Another beat with the name "${existingRoute.name}" already exists!`,
        });
      }
      updateData.name = trimmedName;
    }

    if (updateData.cities && typeof updateData.cities === 'string') {
      updateData.cities = updateData.cities.split(',').map((c) => c.trim()).filter(Boolean);
    }

    const route = await Route.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('assignedSalesman', 'name phone');

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    res.json({ success: true, route });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
export const deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    // Also unassign route from any shops that explicitly referenced this routeId
    await Shop.updateMany({ routeId: route._id }, { $set: { routeId: null } });
    res.json({ success: true, message: `Beat "${route.name}" deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
