import { Order } from '../models/Order.js';
import { Shop } from '../models/Shop.js';
import { Product } from '../models/Product.js';

// Helper to generate order numbers like ORD-2026-0001
const generateOrderNumber = async () => {
  const count = await Order.countDocuments();
  const year = new Date().getFullYear();
  return `ORD-${year}-${(count + 1).toString().padStart(4, '0')}`;
};

// @desc    Create new order (Salesman or Admin)
// @route   POST /api/orders
export const createOrder = async (req, res) => {
  try {
    const { shopId, billType, items, dispatchNotes, orderChannel, isWithoutVisit } = req.body;
    const salesmanId = req.user._id;

    if (!shopId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Shop and order items are required' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Calculate item pricing and check stock
    let subtotal = 0;
    let gstTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }

      const quantity = parseInt(item.quantity, 10);
      const boxCount = item.boxCount || Math.floor(quantity / (product.boxQuantity || 1));
      const price = item.customPrice !== undefined ? parseFloat(item.customPrice) : product.basePrice;
      const itemSubtotal = quantity * price;

      let itemGst = 0;
      if (billType === 'GST') {
        const gstPct = product.gstPercentage || 18;
        itemGst = Math.round((itemSubtotal * gstPct) / 100);
      }

      subtotal += itemSubtotal;
      gstTotal += itemGst;

      const variantName = item.variantName || '';
      const itemSku = item.sku || product.sku || '';

      orderItems.push({
        product: product._id,
        name: product.name,
        variantName,
        sku: itemSku,
        quantity,
        boxCount,
        price,
        gstPercentage: billType === 'GST' ? product.gstPercentage : 0,
        gstAmount: itemGst,
        subtotal: itemSubtotal + itemGst,
      });

      // Deduct stock quantity (and variant stock if present)
      product.stockQuantity = Math.max(0, product.stockQuantity - quantity);
      if (product.hasVariants && variantName && product.variants?.length > 0) {
        const v = product.variants.find((vr) => vr.size === variantName);
        if (v) {
          v.stockQuantity = Math.max(0, (v.stockQuantity || 0) - quantity);
          if (v.stockQuantity === 0) v.isOutOfStock = true;
        }
      }
      if (product.stockQuantity === 0) {
        product.isOutOfStock = true;
      }
      await product.save();
    }

    const totalAmount = subtotal + gstTotal;
    const orderNumber = await generateOrderNumber();

    const channel = orderChannel || (isWithoutVisit ? 'PHONE_ORDER' : 'IN_PERSON_BEAT');
    const remoteFlag = isWithoutVisit || channel === 'PHONE_ORDER';

    const order = await Order.create({
      orderNumber,
      shop: shop._id,
      salesman: salesmanId,
      billType: billType || 'NON_GST',
      items: orderItems,
      subtotal,
      gstTotal,
      totalAmount,
      dispatchNotes: dispatchNotes || '',
      orderChannel: channel,
      isWithoutVisit: remoteFlag,
      status: 'PENDING',
    });

    // Update Shop Dual Ledger balance
    if (billType === 'GST') {
      shop.gstBalance += totalAmount;
    } else {
      shop.nonGstBalance += totalAmount;
    }
    shop.lastVisitedAt = new Date();
    await shop.save();

    // Populate for response and socket emission
    const populatedOrder = await Order.findById(order._id)
      .populate('shop', 'shopName ownerName phone city address')
      .populate('salesman', 'name phone');

    // Emit real-time notification to Warehouse department
    const io = req.app.get('io');
    if (io) {
      io.emit('order:new', {
        orderId: populatedOrder._id,
        orderNumber: populatedOrder.orderNumber,
        shopName: populatedOrder.shop.shopName,
        city: populatedOrder.shop.city,
        salesmanName: populatedOrder.salesman.name,
        totalAmount: populatedOrder.totalAmount,
        billType: populatedOrder.billType,
        itemCount: populatedOrder.items.length,
        createdAt: populatedOrder.createdAt,
      });
    }

    res.status(201).json({ success: true, order: populatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get orders (filterable by shop, salesman, status, billType)
// @route   GET /api/orders
export const getOrders = async (req, res) => {
  try {
    const { shopId, salesmanId, status, billType, city } = req.query;
    const filter = {};

    if (shopId) filter.shop = shopId;
    if (salesmanId) filter.salesman = salesmanId;
    if (status) filter.status = status;
    if (billType) filter.billType = billType;

    // For shop owner role, only return their own shop's orders
    if (req.user.role === 'SHOP_OWNER') {
      filter.shop = req.user.shopId;
    }

    let query = Order.find(filter)
      .populate('shop', 'shopName ownerName phone city address')
      .populate('salesman', 'name phone')
      .sort({ createdAt: -1 });

    const orders = await query.exec();

    // In-memory filter for city if requested
    const filteredOrders = city
      ? orders.filter((o) => o.shop && o.shop.city.toLowerCase() === city.toLowerCase())
      : orders;

    res.json({ success: true, count: filteredOrders.length, orders: filteredOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('shop')
      .populate('salesman', 'name phone')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order status (Warehouse Department dispatch workflow)
// @route   PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, dispatchNotes } = req.body;
    const validStatuses = ['PENDING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id)
      .populate('shop', 'shopName phone')
      .populate('salesman', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (dispatchNotes) order.dispatchNotes = dispatchNotes;
    if (status === 'DISPATCHED') order.dispatchedAt = new Date();
    if (status === 'DELIVERED') order.deliveredAt = new Date();

    await order.save();

    // Real-time socket emit
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status_updated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        shopName: order.shop.shopName,
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
