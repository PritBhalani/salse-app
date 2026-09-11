import { Payment } from '../models/Payment.js';
import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';

const generateReceiptNumber = async () => {
  const count = await Payment.countDocuments();
  const year = new Date().getFullYear();
  return `RCP-${year}-${(count + 1).toString().padStart(4, '0')}`;
};

// @desc    Record new payment collection (Salesman / Admin)
// @route   POST /api/payments
export const recordPayment = async (req, res) => {
  try {
    const {
      shopId,
      billType,
      amount,
      mode,
      chequeNumber,
      chequeBank,
      chequeDate,
      chequePhotoUrl,
      upiTransactionId,
      notes,
    } = req.body;

    const salesmanId = req.user._id;

    if (!shopId || !amount || !billType) {
      return res.status(400).json({ success: false, message: 'Shop, amount and billType are required' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const parsedAmount = parseFloat(amount);
    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      receiptNumber,
      shop: shop._id,
      salesman: salesmanId,
      billType,
      amount: parsedAmount,
      mode: mode || 'CASH',
      chequeNumber,
      chequeBank,
      chequeDate: chequeDate || null,
      chequePhotoUrl: chequePhotoUrl || '',
      upiTransactionId,
      notes,
      collectedAt: new Date(),
    });

    // Update Shop's Dual Ledger balance
    if (billType === 'GST') {
      shop.gstBalance = Math.max(0, shop.gstBalance - parsedAmount);
    } else {
      shop.nonGstBalance = Math.max(0, shop.nonGstBalance - parsedAmount);
    }
    await shop.save();

    // If collected in cash, update salesman's cash-in-hand wallet
    if (mode === 'CASH') {
      await User.findByIdAndUpdate(salesmanId, {
        $inc: { cashInHand: parsedAmount },
      });
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('shop', 'shopName ownerName phone city')
      .populate('salesman', 'name phone');

    res.status(201).json({
      success: true,
      payment: populatedPayment,
      updatedBalances: {
        gstBalance: shop.gstBalance,
        nonGstBalance: shop.nonGstBalance,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get payments (filter by shop, salesman, billType, settled status)
// @route   GET /api/payments
export const getPayments = async (req, res) => {
  try {
    const { shopId, salesmanId, billType, mode, isSettled } = req.query;
    const filter = {};

    if (shopId) filter.shop = shopId;
    if (salesmanId) filter.salesman = salesmanId;
    if (billType) filter.billType = billType;
    if (mode) filter.mode = mode;
    if (isSettled !== undefined) filter.isSettledWithWarehouse = isSettled === 'true';

    if (req.user.role === 'SHOP_OWNER') {
      filter.shop = req.user.shopId;
    }

    const payments = await Payment.find(filter)
      .populate('shop', 'shopName ownerName phone city')
      .populate('salesman', 'name phone')
      .sort({ collectedAt: -1 });

    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Day-End Cash Settlement: Boss/Warehouse confirms physical cash handover from salesman
// @route   POST /api/payments/settle-cash
export const settleSalesmanCash = async (req, res) => {
  try {
    const { salesmanId, amount } = req.body;
    const settledBy = req.user._id;

    const salesman = await User.findById(salesmanId);
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    const settleAmount = amount ? parseFloat(amount) : salesman.cashInHand;

    // Mark pending cash payments as settled
    await Payment.updateMany(
      {
        salesman: salesmanId,
        mode: 'CASH',
        isSettledWithWarehouse: false,
      },
      {
        $set: {
          isSettledWithWarehouse: true,
          settledAt: new Date(),
          settledBy,
        },
      }
    );

    // Deduct from salesman cashInHand
    salesman.cashInHand = Math.max(0, salesman.cashInHand - settleAmount);
    await salesman.save();

    res.json({
      success: true,
      message: `Cash settlement of ₹${settleAmount} confirmed. Remaining cash-in-hand: ₹${salesman.cashInHand}`,
      salesman: {
        id: salesman._id,
        name: salesman.name,
        cashInHand: salesman.cashInHand,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
