import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowUpRight,
  Receipt,
  Users,
  Building2,
  Wallet,
  PhoneCall,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { ordersAPI, shopsAPI, routesAPI, authAPI, paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const DashboardPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalGstTurnover: 0,
    totalNonGstTurnover: 0,
    pendingOrdersCount: 0,
    totalMarketDue: 0,
    totalCashInField: 0,
    totalShops: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ordersRes, shopsRes, routesRes, usersRes, paymentsRes] = await Promise.all([
        ordersAPI.getAll(),
        shopsAPI.getAll(),
        routesAPI.getAll(),
        authAPI.getUsers('SALESMAN'),
        paymentsAPI.getAll(),
      ]);

      const orders = ordersRes.data.orders || [];
      const shops = shopsRes.data.shops || [];
      const routes = routesRes.data.routes || [];
      const salesTeam = usersRes.data.users || [];
      const payments = paymentsRes.data.payments || [];

      // Calculate dual turnovers
      let gstTurnover = 0;
      let nonGstTurnover = 0;
      let pendingCount = 0;

      orders.forEach((o) => {
        if (o.billType === 'GST') gstTurnover += o.totalAmount;
        else nonGstTurnover += o.totalAmount;
        if (o.status === 'PENDING' || o.status === 'PACKED') pendingCount++;
      });

      // Calculate total market dues
      let totalDue = 0;
      shops.forEach((s) => {
        totalDue += (s.gstBalance || 0) + (s.nonGstBalance || 0);
      });

      // Calculate total cash in salesmen hands
      let cashInField = 0;
      salesTeam.forEach((s) => {
        cashInField += s.cashInHand || 0;
      });

      setStats({
        totalGstTurnover: gstTurnover,
        totalNonGstTurnover: nonGstTurnover,
        pendingOrdersCount: pendingCount,
        totalMarketDue: totalDue,
        totalCashInField: cashInField,
        totalShops: shops.length,
      });

      setRecentOrders(orders.slice(0, 5));
      setActiveRoutes(routes);
      setSalesmen(salesTeam);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Wholesale Control Center</span>
            <span className="text-xs font-normal text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full">
              Live Operations
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time field sales dispatch, dual-book accounting balances, and route calling status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('calling-sheet')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-900/20 transition-all active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Pre-Visit Call Sheet</span>
          </button>
          <button
            onClick={() => {
              fetchDashboardData();
              toast.info('Wholesale dashboard metrics refreshed', 'Metrics Updated');
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Turnover Split */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Turnover</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            ₹{(stats.totalGstTurnover + stats.totalNonGstTurnover).toLocaleString()}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-medium">GST: ₹{stats.totalGstTurnover.toLocaleString()}</span>
            <span className="text-amber-400 font-medium">Rough: ₹{stats.totalNonGstTurnover.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Outstanding Dues */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Market Due Balance</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            ₹{stats.totalMarketDue.toLocaleString()}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Active Shops: {stats.totalShops}</span>
            <button
              onClick={() => onNavigate('shops')}
              className="text-sky-400 hover:underline flex items-center gap-0.5"
            >
              View Ledgers &rarr;
            </button>
          </div>
        </div>

        {/* Orders Pending in Warehouse */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Warehouse Queue</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>{stats.pendingOrdersCount}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
              To Pack / Dispatch
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Live Dispatch Alert</span>
            <button
              onClick={() => onNavigate('dispatch')}
              className="text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              Open Dispatch Queue &rarr;
            </button>
          </div>
        </div>

        {/* Salesmen Cash-in-Hand */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Field Cash in Hand</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ₹{stats.totalCashInField.toLocaleString()}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Pending Handover</span>
            <button
              onClick={() => onNavigate('tracking')}
              className="text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Settle Drawer &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Live Beat Routes & Incoming Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Order Stream */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-400" />
              <h2 className="font-bold text-white text-base">Recent Field Orders Stream</h2>
            </div>
            <button
              onClick={() => onNavigate('dispatch')}
              className="text-xs text-sky-400 hover:underline font-medium"
            >
              View All Orders &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Order #</th>
                  <th className="py-2.5 px-3">Shop & City</th>
                  <th className="py-2.5 px-3">Salesman</th>
                  <th className="py-2.5 px-3">Bill Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-white">{order.orderNumber}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200">{order.shop?.shopName}</div>
                      <div className="text-[11px] text-slate-500">{order.shop?.city}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{order.salesman?.name}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.billType === 'GST'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {order.billType === 'GST' ? 'GST Tax' : 'Rough / Cash'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">₹{order.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : order.status === 'DISPATCHED'
                            ? 'bg-sky-500/20 text-sky-300'
                            : order.status === 'PACKED'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-amber-500/20 text-amber-300 animate-pulse'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Active Routes & Beats */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-white text-base">Multi-City Beats & Routes</h2>
              </div>
              <button
                onClick={() => onNavigate('routes')}
                className="text-xs text-sky-400 hover:underline font-medium"
              >
                Plan &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {activeRoutes.map((route) => (
                <div
                  key={route._id}
                  className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200">{route.name}</span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                      {route.shopCount || 0} Shops
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {route.cities.map((city) => (
                      <span
                        key={city}
                        className="text-[11px] px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40"
                      >
                        {city}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Salesman: <b className="text-slate-200">{route.assignedSalesman?.name || 'Unassigned'}</b></span>
                    <span className="text-[11px] text-amber-400 font-medium">
                      {route.scheduleDays?.join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Call to Action */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => onNavigate('calling-sheet')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-sky-400" />
              <span>Call Shops for Next Beat (2-3 Days Ahead)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
