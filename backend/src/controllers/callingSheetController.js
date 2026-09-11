import { Route } from '../models/Route.js';
import { Shop } from '../models/Shop.js';
import { CallingSheetNote } from '../models/CallingSheetNote.js';

// @desc    Get pre-visit calling list for warehouse team (upcoming 2-3 days)
// @route   GET /api/calling-sheet
export const getCallingSheet = async (req, res) => {
  try {
    const { routeId, targetDate } = req.query;

    let routes = [];
    if (routeId) {
      routes = await Route.find({ _id: routeId, isActive: true }).populate('assignedSalesman', 'name phone');
    } else {
      // Find all active routes
      routes = await Route.find({ isActive: true }).populate('assignedSalesman', 'name phone');
    }

    // Default target date is 2 days from now if not specified
    const visitDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    visitDate.setHours(0, 0, 0, 0);

    const callingSheetData = [];

    for (const route of routes) {
      // Find all shops in this route's cities
      const shops = await Shop.find({
        city: { $in: route.cities },
        isActive: true,
      }).sort({ city: 1, shopName: 1 });

      const shopRows = await Promise.all(
        shops.map(async (shop) => {
          // Check if a call note already exists for this shop & planned visit date
          const note = await CallingSheetNote.findOne({
            shop: shop._id,
            route: route._id,
          }).populate('calledBy', 'name');

          return {
            shopId: shop._id,
            shopName: shop.shopName,
            ownerName: shop.ownerName,
            phone: shop.phone,
            altPhone: shop.altPhone,
            city: shop.city,
            address: shop.address,
            // Dual ledger balances to inform during call
            gstBalance: shop.gstBalance,
            nonGstBalance: shop.nonGstBalance,
            totalDue: shop.gstBalance + shop.nonGstBalance,
            lastVisitedAt: shop.lastVisitedAt,
            // Calling workflow status
            callStatus: note ? note.callStatus : 'PENDING',
            remarks: note ? note.remarks : '',
            expectedPaymentAmount: note ? note.expectedPaymentAmount : 0,
            calledAt: note ? note.calledAt : null,
            calledBy: note?.calledBy ? note.calledBy.name : null,
            noteId: note ? note._id : null,
          };
        })
      );

      callingSheetData.push({
        routeId: route._id,
        routeName: route.name,
        cities: route.cities,
        salesman: route.assignedSalesman
          ? { id: route.assignedSalesman._id, name: route.assignedSalesman.name, phone: route.assignedSalesman.phone }
          : null,
        scheduledDays: route.scheduleDays,
        nextVisitDate: route.nextVisitDate || visitDate,
        totalShops: shopRows.length,
        pendingCalls: shopRows.filter((s) => s.callStatus === 'PENDING').length,
        shops: shopRows,
      });
    }

    res.json({
      success: true,
      targetDate: visitDate,
      routes: callingSheetData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update call status / notes for a shop on the calling sheet
// @route   POST /api/calling-sheet/log-call
export const logCallNote = async (req, res) => {
  try {
    const { shopId, routeId, plannedVisitDate, callStatus, remarks, expectedPaymentAmount } = req.body;
    const calledBy = req.user._id;

    if (!shopId || !routeId) {
      return res.status(400).json({ success: false, message: 'shopId and routeId are required' });
    }

    let note = await CallingSheetNote.findOne({ shop: shopId, route: routeId });

    if (note) {
      note.callStatus = callStatus || note.callStatus;
      note.remarks = remarks !== undefined ? remarks : note.remarks;
      note.expectedPaymentAmount = expectedPaymentAmount !== undefined ? parseFloat(expectedPaymentAmount) : note.expectedPaymentAmount;
      note.calledBy = calledBy;
      note.calledAt = new Date();
      await note.save();
    } else {
      note = await CallingSheetNote.create({
        shop: shopId,
        route: routeId,
        plannedVisitDate: plannedVisitDate ? new Date(plannedVisitDate) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        callStatus: callStatus || 'PENDING',
        remarks: remarks || '',
        expectedPaymentAmount: expectedPaymentAmount ? parseFloat(expectedPaymentAmount) : 0,
        calledBy,
        calledAt: new Date(),
      });
    }

    const populatedNote = await CallingSheetNote.findById(note._id).populate('calledBy', 'name');

    res.json({
      success: true,
      note: populatedNote,
      message: 'Call note logged successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
