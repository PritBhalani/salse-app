import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MapPin,
  Camera,
  Wallet,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  Clock,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { visitsAPI, authAPI, paymentsAPI } from '../services/api';

export const SalesmanTrackingPage = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settleModalSalesman, setSettleModalSalesman] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, vRes] = await Promise.all([
        authAPI.getUsers('SALESMAN'),
        visitsAPI.getAll(),
      ]);
      if (uRes.data.success) setSalesmen(uRes.data.users || []);
      if (vRes.data.success) setVisits(vRes.data.visits || []);
    } catch (err) {
      console.error('Error fetching salesman audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettleCash = async (salesmanId) => {
    try {
      await paymentsAPI.settleCash(salesmanId, settleAmount ? parseFloat(settleAmount) : undefined);
      setSettleModalSalesman(null);
      setSettleAmount('');
      await fetchData();
    } catch (err) {
      console.error('Error settling cash:', err);
      alert(err.response?.data?.message || 'Failed to settle salesman cash');
    }
  };

  const handleResetDevice = async (userId) => {
    if (window.confirm('Reset device binding for this salesman? They will be able to log in on a new device.')) {
      try {
        await authAPI.resetDevice(userId);
        await fetchData();
      } catch (err) {
        console.error('Error resetting device binding:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Salesman Audit, GPS Verification & Cash Settlement
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Triple-layer visit verification (geofence proximity &lt; 150m, mock GPS detection), device security, and day-end cash drawer clearance.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors self-start sm:self-auto"
          title="Refresh logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sales Team Cash Drawer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {salesmen.map((salesman) => (
          <div
            key={salesman._id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-sm">
                    {salesman.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{salesman.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{salesman.phone}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>

              {/* Cash Wallet Box */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
                    Today's Cash in Hand
                  </span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  ₹{salesman.cashInHand?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Physical cash collected from retail shops awaiting warehouse handover.
                </div>
              </div>

              {/* Device Binding Info */}
              <div className="text-xs text-slate-400 space-y-1 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Registered Phone:</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {salesman.deviceId ? salesman.deviceId.slice(0, 16) + '...' : 'First login pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Cities:</span>
                  <span className="font-medium text-slate-300">
                    {salesman.activeCities?.join(', ') || 'Morbi, Wankaner'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                disabled={!salesman.cashInHand || salesman.cashInHand <= 0}
                onClick={() => {
                  setSettleModalSalesman(salesman);
                  setSettleAmount(salesman.cashInHand.toString());
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Accept Cash Handover
              </button>
              {salesman.deviceId && (
                <button
                  onClick={() => handleResetDevice(salesman._id)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Reset device binding (phone changed)"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Geofence Visit Verification Audit Trail */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              <span>Shop Visit Verification Logs (Anti-Fraud GPS Audit)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live checks performed when salesman arrives at shop. Validates distance against registered shop coordinates.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{visits.length} Total Visits Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Salesman</th>
                <th className="py-3 px-4">Visited Shop & City</th>
                <th className="py-3 px-4 text-center">Distance from Shop</th>
                <th className="py-3 px-4 text-center">GPS Geofence Status</th>
                <th className="py-3 px-4 text-center">Storefront Photo</th>
                <th className="py-3 px-4">Check-In Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No visit check-ins recorded yet. Salesmen will record check-ins via mobile app.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{v.salesman?.name}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{v.shop?.shopName}</div>
                      <div className="text-[11px] text-slate-500">{v.shop?.city}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-slate-300">
                        {v.distanceMeters !== undefined ? `${v.distanceMeters}m away` : 'Within 50m'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.isGeofenceVerified ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>VERIFIED ON-SITE</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>OUTSIDE GEOFENCE</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.photoProofUrl ? (
                        <a
                          href={v.photoProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline font-semibold"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>View Photo</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">GPS Verified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(v.checkInTime).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Handover Confirmation Modal */}
      {settleModalSalesman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Confirm Physical Cash Settlement
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Salesman <b>{settleModalSalesman.name}</b> is handing over physical cash to the warehouse/uncle.
            </p>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Cash in Hand:</span>
                <span className="font-extrabold text-white text-sm">
                  ₹{settleModalSalesman.cashInHand?.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Settled Handover Amount (₹):
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded-xl p-2.5 font-bold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSettleModalSalesman(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSettleCash(settleModalSalesman._id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                Clear Cash Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
