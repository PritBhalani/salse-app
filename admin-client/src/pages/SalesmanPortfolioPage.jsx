import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Receipt,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  ArrowRight,
  X,
  UserCheck,
  MapPin,
} from 'lucide-react';
import { authAPI, ordersAPI, shopsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const STATUS_COLORS = {
  PENDING: 'bg-amber-500/20 text-amber-300',
  PACKED: 'bg-blue-500/20 text-blue-300',
  DISPATCHED: 'bg-indigo-500/20 text-indigo-300',
  DELIVERED: 'bg-emerald-500/20 text-emerald-300',
  CANCELLED: 'bg-rose-500/20 text-rose-400',
};

export const SalesmanPortfolioPage = () => {
  const { toast } = useToast();
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  // Shop assignment state
  const [allShops, setAllShops] = useState([]);
  const [assigningShopId, setAssigningShopId] = useState(null);

  // Expanded shop detail
  const [expandedShopId, setExpandedShopId] = useState(null);
  const [activeShopTab, setActiveShopTab] = useState('orders');

  // Active portfolio tab
  const [portfolioTab, setPortfolioTab] = useState('shops');

  useEffect(() => {
    fetchSalesmen();
    fetchAllShops();
  }, []);

  const fetchSalesmen = async () => {
    setLoadingList(true);
    try {
      const res = await authAPI.getUsers('SALESMAN');
      if (res.data.success) {
        setSalesmen(res.data.users || []);
      }
    } catch (err) {
      console.error('Error fetching salesmen:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchAllShops = async () => {
    try {
      const res = await shopsAPI.getAll();
      if (res.data.success) setAllShops(res.data.shops || []);
    } catch (err) {
      console.error('Error fetching shops:', err);
    }
  };

  const fetchPortfolio = async (salesmanId) => {
    if (!salesmanId) return;
    setLoading(true);
    setPortfolio(null);
    try {
      const res = await ordersAPI.getSalesmanPortfolio(salesmanId);
      if (res.data.success) setPortfolio(res.data);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      toast.error('Failed to load salesman portfolio', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSalesman = (id) => {
    setSelectedSalesmanId(id);
    setExpandedShopId(null);
    setPortfolioTab('shops');
    fetchPortfolio(id);
  };

  const handleAssignSalesman = async (shopId, action) => {
    if (!selectedSalesmanId) return;
    setAssigningShopId(shopId);
    try {
      const res = await shopsAPI.assignSalesman(shopId, selectedSalesmanId, action);
      if (res.data.success) {
        toast.success(res.data.message, action === 'add' ? 'Shop Assigned' : 'Shop Removed');
        await fetchAllShops();
        await fetchPortfolio(selectedSalesmanId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed', 'Error');
    } finally {
      setAssigningShopId(null);
    }
  };

  const selectedSalesman = salesmen.find((s) => s._id === selectedSalesmanId);

  const isShopAssigned = (shopId) => {
    if (!portfolio) return false;
    return portfolio.shopPortfolio.some((sp) => sp.shop._id === shopId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-violet-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Salesman Portfolio & Ledger</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Assign shops to salesmen, view their full order ledger, bills with product details, and payment collections.
            </p>
          </div>
          <button
            onClick={() => { fetchSalesmen(); fetchAllShops(); if (selectedSalesmanId) fetchPortfolio(selectedSalesmanId); }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors self-start sm:self-auto"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading || loadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Salesman Selector */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Select Salesman
            </div>
            {loadingList ? (
              <div className="text-center py-6 text-slate-400 text-xs">Loading...</div>
            ) : (
              <div className="space-y-1.5">
                {salesmen.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => handleSelectSalesman(s._id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedSalesmanId === s._id
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{s.name}</div>
                    <div className={`text-[10px] mt-0.5 ${selectedSalesmanId === s._id ? 'text-violet-200' : 'text-slate-500'}`}>
                      📱 {s.phone}
                    </div>
                    {s.cashInHand > 0 && (
                      <div className={`text-[10px] font-bold mt-0.5 ${selectedSalesmanId === s._id ? 'text-yellow-200' : 'text-amber-400'}`}>
                        💰 Cash: {fmt(s.cashInHand)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Portfolio View */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedSalesmanId && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-semibold">Select a salesman to view their portfolio</p>
              <p className="text-slate-600 text-xs mt-1">See assigned shops, order history, and payment collections</p>
            </div>
          )}

          {selectedSalesman && (
            <>
              {/* Summary Cards */}
              {portfolio && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Assigned Shops', value: portfolio.summary.totalShops, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
                    { label: 'Total Billed', value: fmt(portfolio.summary.totalBilledAll), icon: Receipt, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
                    { label: 'Total Collected', value: fmt(portfolio.summary.totalCollectedAll), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
                    { label: 'Outstanding Due', value: fmt(portfolio.summary.totalDueAll), icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
                  ].map((card) => (
                    <div key={card.label} className={`${card.bg} border rounded-xl p-3`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${card.color} flex items-center gap-1`}>
                        <card.icon className="w-3 h-3" />
                        {card.label}
                      </div>
                      <div className="text-base font-extrabold text-white mt-1">{card.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex border-b border-slate-800">
                  {[
                    { id: 'shops', label: `Assigned Shops (${portfolio?.summary.totalShops ?? 0})` },
                    { id: 'assign', label: 'Manage Shop Assignment' },
                    { id: 'all-orders', label: `All Orders (${portfolio?.summary.totalOrders ?? 0})` },
                    { id: 'all-payments', label: `All Payments (${portfolio?.summary.totalPayments ?? 0})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPortfolioTab(tab.id)}
                      className={`flex-1 px-3 py-3 text-[11px] font-bold transition-colors ${
                        portfolioTab === tab.id
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {loading && (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading portfolio...
                    </div>
                  )}

                  {/* TAB: Assigned Shops with order/payment detail */}
                  {!loading && portfolioTab === 'shops' && portfolio && (
                    <div className="space-y-3">
                      {portfolio.shopPortfolio.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No shops assigned. Use "Manage Shop Assignment" tab to assign shops.
                        </div>
                      )}
                      {portfolio.shopPortfolio.map((sp) => {
                        const isExpanded = expandedShopId === sp.shop._id;
                        return (
                          <div key={sp.shop._id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                            {/* Shop Row */}
                            <button
                              onClick={() => {
                                setExpandedShopId(isExpanded ? null : sp.shop._id);
                                setActiveShopTab('orders');
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center gap-3 text-left">
                                <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                                <div>
                                  <div className="text-sm font-bold text-white">{sp.shop.shopName}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {sp.shop.city} • {sp.orderCount} orders • {sp.paymentCount} payments
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-right">
                                <div>
                                  <div className="text-[10px] text-slate-500">Balance Due</div>
                                  <div className={`text-sm font-extrabold ${sp.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {fmt(sp.balanceDue)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-500">Total Billed</div>
                                  <div className="text-sm font-bold text-sky-300">{fmt(sp.totalBilled)}</div>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </button>

                            {/* Expanded Detail */}
                            {isExpanded && (
                              <div className="border-t border-slate-700 p-4">
                                {/* Sub-tabs */}
                                <div className="flex gap-2 mb-4">
                                  {['orders', 'payments'].map((t) => (
                                    <button
                                      key={t}
                                      onClick={() => setActiveShopTab(t)}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors capitalize ${
                                        activeShopTab === t
                                          ? 'bg-violet-600 text-white'
                                          : 'bg-slate-800 text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {t === 'orders' ? `Bills (${sp.orders.length})` : `Payments (${sp.payments.length})`}
                                    </button>
                                  ))}
                                </div>

                                {/* Orders with product items */}
                                {activeShopTab === 'orders' && (
                                  <div className="space-y-3">
                                    {sp.orders.length === 0 && (
                                      <p className="text-slate-500 text-xs text-center py-4">No orders for this shop</p>
                                    )}
                                    {sp.orders.map((order) => (
                                      <div key={order._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                        {/* Order Header */}
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-white">{order.orderNumber}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${order.billType === 'GST' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                              {order.billType}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[order.status] || ''}`}>
                                              {order.status}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 text-right">
                                            <span className="text-[10px] text-slate-400">{fmtDate(order.createdAt)}</span>
                                            <span className="text-sm font-extrabold text-white">{fmt(order.totalAmount)}</span>
                                          </div>
                                        </div>
                                        {/* Product Items List */}
                                        <div className="divide-y divide-slate-800/60">
                                          {order.items?.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                              <div className="flex items-center gap-2">
                                                <Package className="w-3 h-3 text-slate-500 shrink-0" />
                                                <span className="text-slate-200 font-medium">{item.name}</span>
                                                {item.variantName && <span className="text-slate-500">({item.variantName})</span>}
                                                {item.sku && <span className="text-slate-600 font-mono text-[10px]">#{item.sku}</span>}
                                              </div>
                                              <div className="flex items-center gap-3 text-right shrink-0">
                                                <span className="text-slate-400">{item.quantity} pcs × {fmt(item.price)}</span>
                                                <span className="text-white font-bold">{fmt(item.subtotal)}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        {/* Order Footer */}
                                        {order.gstTotal > 0 && (
                                          <div className="flex justify-end px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-800/60">
                                            Subtotal: {fmt(order.subtotal)} + GST: {fmt(order.gstTotal)} = {fmt(order.totalAmount)}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Payments */}
                                {activeShopTab === 'payments' && (
                                  <div className="space-y-2">
                                    {sp.payments.length === 0 && (
                                      <p className="text-slate-500 text-xs text-center py-4">No payments collected for this shop</p>
                                    )}
                                    {sp.payments.map((p) => (
                                      <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between px-3 py-2.5">
                                        <div>
                                          <div className="text-xs font-mono font-bold text-white">{p.receiptNumber}</div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            {p.mode} • {fmtDate(p.collectedAt)}
                                            {p.isSettledWithWarehouse && <span className="ml-2 text-emerald-400 font-bold">✓ Settled</span>}
                                          </div>
                                        </div>
                                        <div className="text-sm font-extrabold text-emerald-400">{fmt(p.amount)}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB: Manage Shop Assignment */}
                  {portfolioTab === 'assign' && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 mb-4">
                        Add or remove shops from <span className="font-bold text-violet-300">{selectedSalesman?.name}</span>'s permanent portfolio.
                      </p>
                      {allShops.map((shop) => {
                        const assigned = isShopAssigned(shop._id);
                        const isLoading = assigningShopId === shop._id;
                        return (
                          <div key={shop._id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
                            <div>
                              <div className="text-sm font-bold text-white">{shop.shopName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" /> {shop.city} • {shop.ownerName}
                              </div>
                              {shop.assignedSalesmen?.length > 0 && (
                                <div className="text-[10px] text-violet-400 mt-0.5">
                                  👥 Also assigned: {shop.assignedSalesmen.filter((s) => (s._id || s) !== selectedSalesmanId).map((s) => s.name || 'Unknown').join(', ') || 'None others'}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleAssignSalesman(shop._id, assigned ? 'remove' : 'add')}
                              disabled={isLoading}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                assigned
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                                  : 'bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30'
                              } disabled:opacity-50`}
                            >
                              {isLoading ? '...' : assigned ? '− Remove' : '+ Assign'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB: All Orders (flat list) */}
                  {!loading && portfolioTab === 'all-orders' && portfolio && (
                    <div className="space-y-3">
                      {portfolio.allOrders.length === 0 && (
                        <p className="text-center py-8 text-slate-500 text-xs">No orders found</p>
                      )}
                      {portfolio.allOrders.map((order) => (
                        <div key={order._id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                          {/* Order Header */}
                          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-white">{order.orderNumber}</span>
                              <span className="text-[10px] text-slate-400">{order.shop?.shopName}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${order.billType === 'GST' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                {order.billType}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[order.status] || ''}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-slate-400">{fmtDate(order.createdAt)}</span>
                              <span className="text-sm font-extrabold text-white">{fmt(order.totalAmount)}</span>
                            </div>
                          </div>
                          {/* Items */}
                          <div className="divide-y divide-slate-800/50">
                            {order.items?.map((item, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <Package className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="text-slate-300">{item.name}</span>
                                  {item.variantName && <span className="text-slate-500">({item.variantName})</span>}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-slate-400">{item.quantity} × {fmt(item.price)}</span>
                                  <span className="text-white font-bold">{fmt(item.subtotal)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB: All Payments (flat list) */}
                  {!loading && portfolioTab === 'all-payments' && portfolio && (
                    <div className="space-y-2">
                      {portfolio.allPayments.length === 0 && (
                        <p className="text-center py-8 text-slate-500 text-xs">No payments found</p>
                      )}
                      {portfolio.allPayments.map((p) => (
                        <div key={p._id} className="bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between px-4 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-white">{p.receiptNumber}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                p.mode === 'CASH' ? 'bg-amber-500/20 text-amber-300' :
                                p.mode === 'UPI' ? 'bg-blue-500/20 text-blue-300' :
                                p.mode === 'CHEQUE' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-slate-600/30 text-slate-300'
                              }`}>{p.mode}</span>
                              {p.isSettledWithWarehouse && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">✓ SETTLED</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {p.shop?.shopName} • {p.shop?.city} • {fmtDate(p.collectedAt)}
                            </div>
                          </div>
                          <div className="text-base font-extrabold text-emerald-400">{fmt(p.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
