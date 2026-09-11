import * as XLSX from 'xlsx';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';

// @desc    Export Orders to Miracle Accounting Compatible Excel
// @route   GET /api/miracle/export-sales
export const exportSalesToMiracle = async (req, res) => {
  try {
    const { billType, startDate, endDate } = req.query;
    const filter = {};

    if (billType) filter.billType = billType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(filter)
      .populate('shop')
      .populate('salesman', 'name')
      .populate('items.product')
      .sort({ createdAt: 1 });

    const rows = [];

    for (const order of orders) {
      for (const item of order.items) {
        rows.push({
          'Voucher Type': order.billType === 'GST' ? 'GST Sales' : 'Estimate Sales',
          'Voucher No': order.orderNumber,
          'Date': new Date(order.createdAt).toLocaleDateString('en-IN'),
          'Party Name': order.shop?.shopName || 'Cash Customer',
          'GSTIN': order.shop?.gstNumber || 'URP',
          'City': order.shop?.city || '',
          'Salesman': order.salesman?.name || '',
          'Item Name': item.name,
          'SKU': item.product?.sku || '',
          'Category': item.product?.category || '',
          'Quantity': item.quantity,
          'Unit': item.product?.uom || 'Pcs',
          'Rate': item.price,
          'Item Subtotal': item.price * item.quantity,
          'GST %': item.gstPercentage || 0,
          'GST Amount': item.gstAmount || 0,
          'Total Amount': item.subtotal,
          'Status': order.status,
        });
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Miracle_Sales_Import');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Miracle_Sales_${billType || 'ALL'}_${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Payment Receipts to Miracle Accounting Compatible Excel
// @route   GET /api/miracle/export-receipts
export const exportReceiptsToMiracle = async (req, res) => {
  try {
    const { billType, startDate, endDate } = req.query;
    const filter = {};

    if (billType) filter.billType = billType;
    if (startDate || endDate) {
      filter.collectedAt = {};
      if (startDate) filter.collectedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.collectedAt.$lte = end;
      }
    }

    const payments = await Payment.find(filter)
      .populate('shop')
      .populate('salesman', 'name')
      .sort({ collectedAt: 1 });

    const rows = payments.map((p) => ({
      'Receipt No': p.receiptNumber,
      'Voucher Type': p.billType === 'GST' ? 'GST Bank/Cash Receipt' : 'Rough Cash Receipt',
      'Date': new Date(p.collectedAt).toLocaleDateString('en-IN'),
      'Party Name': p.shop?.shopName || '',
      'City': p.shop?.city || '',
      'Salesman': p.salesman?.name || '',
      'Payment Mode': p.mode,
      'Amount (INR)': p.amount,
      'Cheque No': p.chequeNumber || '',
      'Bank Name': p.chequeBank || '',
      'Cheque Date': p.chequeDate ? new Date(p.chequeDate).toLocaleDateString('en-IN') : '',
      'UPI Ref': p.upiTransactionId || '',
      'Cash Settled With Warehouse': p.isSettledWithWarehouse ? 'YES' : 'NO',
      'Remarks': p.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Miracle_Receipts_Import');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Miracle_Receipts_${billType || 'ALL'}_${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
