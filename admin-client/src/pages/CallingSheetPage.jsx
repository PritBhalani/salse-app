import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Search,
  Filter,
  Save,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { callingSheetAPI, routesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export const CallingSheetPage = () => {
  const { toast } = useToast();
  const [routesData, setRoutesData] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [savingNoteId, setSavingNoteId] = useState(null);

  const fetchCallingSheet = async (routeId = '') => {
    setLoading(true);
    try {
      const res = await callingSheetAPI.get(routeId ? { routeId } : {});
      if (res.data.success) {
        setRoutesData(res.data.routes || []);
        if (!selectedRouteId && res.data.routes?.length > 0) {
          setSelectedRouteId(res.data.routes[0].routeId);
        }
      }
    } catch (err) {
      console.error('Error fetching calling sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallingSheet(selectedRouteId);
  }, [selectedRouteId]);

  const activeRoute = routesData.find((r) => r.routeId === selectedRouteId) || routesData[0];

  const handleUpdateCallStatus = async (shop, callStatus, remarks = '', expectedPayment = 0) => {
    setSavingNoteId(shop.shopId);
    try {
      await callingSheetAPI.logCall({
        shopId: shop.shopId,
        routeId: activeRoute.routeId,
        plannedVisitDate: activeRoute.nextVisitDate,
        callStatus,
        remarks: remarks || shop.remarks,
        expectedPaymentAmount: expectedPayment || shop.expectedPaymentAmount,
      });
      // Refresh calling sheet
      await fetchCallingSheet(selectedRouteId);
      toast.success(`Call status updated for ${shop.shopName}!`, 'Call Logged');
    } catch (err) {
      console.error('Error logging call note:', err);
      toast.error(err.response?.data?.message || 'Failed to update call status', 'Call Error');
    } finally {
      setSavingNoteId(null);
    }
  };

  const generateWhatsAppLink = (shop) => {
    const salesmanName = activeRoute?.salesman?.name || 'our sales executive';
    const visitDateStr = activeRoute?.nextVisitDate
      ? new Date(activeRoute.nextVisitDate).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })
      : 'in 2-3 days';

    const text = encodeURIComponent(
      `*Shivam Marketing - Bath Accessories Wholesale*\n\nNamaste ${shop.ownerName || shop.shopName} ji,\n\nOur representative *${salesmanName}* will visit your shop on *${visitDateStr}* to collect pending payments and take fresh orders for bath accessories & fittings.\n\n*Current Due Summary:*\n- GST Bill Due: ₹${shop.gstBalance.toLocaleString()}\n- Rough/Non-GST Due: ₹${shop.nonGstBalance.toLocaleString()}\n*Total Due: ₹${shop.totalDue.toLocaleString()}*\n\nPlease keep the payment ready.\nThank you!`
    );
    return `https://wa.me/91${shop.phone}?text=${text}`;
  };

  // Filter shops
  const filteredShops = (activeRoute?.shops || []).filter((shop) => {
    const matchesSearch =
      shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.phone.includes(searchQuery);

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return shop.callStatus === 'PENDING';
    if (statusFilter === 'COMPLETED') return shop.callStatus !== 'PENDING';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-sky-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Pre-Visit Calling Sheet (2-3 Days Advance Notice)
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Warehouse team dials shop owners before salesman visit so payments are kept ready and no shop is missed on the beat.
            </p>
          </div>

          {/* Route Beat Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Active Beat:</span>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500"
            >
              {routesData.map((r) => (
                <option key={r.routeId} value={r.routeId}>
                  {r.routeName} ({r.cities.join(', ')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Beat Details Banner */}
        {activeRoute && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Assigned Salesman</span>
              <span className="font-bold text-white text-sm">
                {activeRoute.salesman?.name || 'Not assigned'}
              </span>
              <span className="text-slate-500 block text-[11px]">{activeRoute.salesman?.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Scheduled Visit Date</span>
              <span className="font-bold text-sky-400 text-sm">
                {activeRoute.nextVisitDate
                  ? new Date(activeRoute.nextVisitDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Upcoming'}
              </span>
              <span className="text-slate-500 block text-[11px]">
                {activeRoute.scheduledDays?.join(', ')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Shops on Route</span>
              <span className="font-bold text-white text-sm">{activeRoute.totalShops} Shops</span>
              <span className="text-amber-400 block text-[11px]">
                {activeRoute.pendingCalls} Calls Pending
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Covered Cities</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {activeRoute.cities?.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search shop, owner or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === 'ALL'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Shops ({activeRoute?.totalShops || 0})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Calls ({activeRoute?.pendingCalls || 0})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Called ({ (activeRoute?.totalShops || 0) - (activeRoute?.pendingCalls || 0) })
          </button>
        </div>
      </div>

      {/* Calling Sheet List */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Shop & Owner</th>
                <th className="py-3 px-3">City</th>
                <th className="py-3 px-4 text-right">Dual Balances Due</th>
                <th className="py-3 px-4">Call Status</th>
                <th className="py-3 px-4">Remarks & Expected Payment</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredShops.map((shop) => (
                <tr key={shop.shopId} className="hover:bg-slate-800/40 transition-colors">
                  {/* Shop Details */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{shop.shopName}</div>
                    <div className="text-slate-400 text-xs">{shop.ownerName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`tel:${shop.phone}`}
                        className="text-sky-400 hover:underline font-mono text-xs flex items-center gap-1 font-semibold"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{shop.phone}</span>
                      </a>
                      {shop.altPhone && (
                        <span className="text-slate-500 text-[11px]">Alt: {shop.altPhone}</span>
                      )}
                    </div>
                  </td>

                  {/* City & Address */}
                  <td className="py-3.5 px-3">
                    <span className="font-medium text-slate-200">{shop.city}</span>
                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={shop.address}>
                      {shop.address}
                    </div>
                  </td>

                  {/* Dual Balances */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-extrabold text-amber-400 text-sm">
                      ₹{shop.totalDue.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-emerald-400">
                      GST: ₹{shop.gstBalance.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Rough: ₹{shop.nonGstBalance.toLocaleString()}
                    </div>
                  </td>

                  {/* Call Status Badge & Quick Selector */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5">
                      <select
                        value={shop.callStatus}
                        onChange={(e) => handleUpdateCallStatus(shop, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border focus:outline-none ${
                          shop.callStatus === 'PAYMENT_READY'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : shop.callStatus === 'ORDER_READY'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : shop.callStatus === 'BOTH_READY'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : shop.callStatus === 'SHOP_CLOSED'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : shop.callStatus === 'CALL_BACK'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <option value="PENDING">⏳ PENDING CALL</option>
                        <option value="PAYMENT_READY">💵 PAYMENT READY</option>
                        <option value="ORDER_READY">📝 ORDER READY</option>
                        <option value="BOTH_READY">✨ BOTH READY</option>
                        <option value="CALL_BACK">📞 CALL BACK LATER</option>
                        <option value="NO_ANSWER">🚫 NO ANSWER</option>
                        <option value="SHOP_CLOSED">🔒 SHOP CLOSED</option>
                      </select>

                      {shop.calledAt && (
                        <div className="text-[10px] text-slate-500">
                          Called {new Date(shop.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {shop.calledBy || 'Warehouse'}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Remarks & Expected Payment */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <input
                        type="text"
                        defaultValue={shop.remarks}
                        placeholder="Add call notes / items needed..."
                        onBlur={(e) => handleUpdateCallStatus(shop, shop.callStatus, e.target.value, shop.expectedPaymentAmount)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 w-full focus:outline-none focus:border-sky-500"
                      />
                      {shop.callStatus === 'PAYMENT_READY' && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Expected ₹:</span>
                          <input
                            type="number"
                            defaultValue={shop.expectedPaymentAmount}
                            placeholder="Amount"
                            onBlur={(e) => handleUpdateCallStatus(shop, shop.callStatus, shop.remarks, parseFloat(e.target.value) || 0)}
                            className="bg-slate-800 border border-slate-700 text-emerald-300 text-xs rounded-lg px-2 py-0.5 w-24 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions (Dial / WhatsApp) */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={`tel:${shop.phone}`}
                        className="p-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 transition-colors"
                        title="Direct Call"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                      <a
                        href={generateWhatsAppLink(shop)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Send WhatsApp Payment Reminder"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
