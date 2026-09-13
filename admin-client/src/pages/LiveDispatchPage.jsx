import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Boxes,
  Send,
} from 'lucide-react';
import { ordersAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export const LiveDispatchPage = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [dispatchModalOrder, setDispatchModalOrder] = useState(null);
  const [dispatchNotes, setDispatchNotes] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getAll();
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, status, notes = '') => {
    try {
      await ordersAPI.updateStatus(orderId, status, notes);
      await fetchOrders();
      setDispatchModalOrder(null);
      setDispatchNotes('');

      const statusLabels = {
        PACKED: 'Order marked as Packed (Ready for loading)',
        DISPATCHED: 'Order dispatched on delivery route',
        DELIVERED: 'Order marked as Delivered & Completed',
        CANCELLED: 'Order marked as Cancelled',
      };

      toast.success(
        statusLabels[status] || `Order status updated to ${status}!`,
        'Dispatch Updated'
      );
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error(err.response?.data?.message || 'Failed to update order status', 'Dispatch Error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ACTIVE') return o.status === 'PENDING' || o.status === 'PACKED';
    if (statusFilter === 'DISPATCHED') return o.status === 'DISPATCHED';
    if (statusFilter === 'DELIVERED') return o.status === 'DELIVERED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Warehouse Order & Dispatch Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Incoming live orders from salesmen, packing pick-lists with box counts, and vehicle dispatch tracking.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending / To Pack
          </button>
          <button
            onClick={() => setStatusFilter('DISPATCHED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === 'DISPATCHED'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Out for Delivery
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Orders
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            No orders found matching the filter.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order._id;
            return (
              <div
                key={order._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700/80 transition-all"
              >
                {/* Order Summary Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        order.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : order.status === 'PACKED'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : order.status === 'DISPATCHED'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      <Package className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-base">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            order.billType === 'GST'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {order.billType === 'GST' ? 'GST INVOICE' : 'WITHOUT GST (ROUGH)'}
                        </span>
                        {order.isWithoutVisit || order.orderChannel === 'PHONE_ORDER' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            📞 Phone Order (Without Visit)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            📍 Beat Visit
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300'
                              : order.status === 'PACKED'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : order.status === 'DISPATCHED'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{order.shop?.shopName}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">{order.shop?.city}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">Punched by: <b className="text-slate-200">{order.salesman?.name}</b></span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-500 text-[11px]">
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Total & Workflow Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Total Amount
                      </div>
                      <div className="text-lg font-extrabold text-white">
                        ₹{order.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {order.items?.length || 0} Products
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'PACKED')}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>Pack Order</span>
                        </button>
                      )}

                      {order.status === 'PACKED' && (
                        <button
                          onClick={() => {
                            setDispatchModalOrder(order);
                            setDispatchNotes('Loaded in Delivery Vehicle');
                          }}
                          className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
                        </button>
                      )}

                      {order.status === 'DISPATCHED' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'DELIVERED')}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title={isExpanded ? 'Hide items' : 'View pick list'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dispatch Notes / Driver Info if Dispatched */}
                {order.dispatchNotes && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span><b>Dispatch Details:</b> {order.dispatchNotes}</span>
                  </div>
                )}

                {/* Expanded Picking List / Items Breakdown */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        Warehouse Pick List & Box Quantities
                      </span>
                      <button
                        onClick={() => window.print()}
                        className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print Pick List</span>
                      </button>
                    </div>

                    <div className="bg-slate-950/60 rounded-xl overflow-hidden border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/40 text-slate-400 uppercase font-semibold">
                          <tr>
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-3 text-center">Loose Qty</th>
                            <th className="py-2 px-3 text-center">Master Box Units</th>
                            <th className="py-2 px-3 text-right">Rate</th>
                            <th className="py-2 px-3 text-right">Item Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/60">
                              <td className="py-2.5 px-3 font-medium text-white">{item.name}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-sky-400">
                                {item.quantity} Pcs
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.boxCount > 0 ? (
                                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                                    {item.boxCount} Full Boxes
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">Loose Pcs</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">₹{item.price}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-white">
                                ₹{item.subtotal.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dispatch Modal */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Dispatch Order {dispatchModalOrder.orderNumber}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter vehicle number, tempo details or driver contact to update the shop owner.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vehicle / Tempo & Driver Details:
                </label>
                <textarea
                  rows="3"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g., Chota Hathi GJ-03-BW-1234, Driver Naresh (9825000000)"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDispatchModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(dispatchModalOrder._id, 'DISPATCHED', dispatchNotes)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
