import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShoppingBag,
  CreditCard,
  Phone,
  UserPlus,
  ExternalLink,
  ChevronRight,
  Boxes,
  Plus,
  Minus,
  MessageSquare,
  Truck,
  Sparkles,
  Search,
  Share2,
  Edit3,
  TrendingUp,
  Clock,
  PackageCheck,
  Check,
  Award,
  Navigation,
  DollarSign,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Send,
  X,
  ShieldCheck,
  Calendar,
  Percent,
} from 'lucide-react';
import {
  shopsAPI,
  productsAPI,
  ordersAPI,
  paymentsAPI,
  routesAPI,
  authAPI,
  visitsAPI,
} from '../services/api';
import { useSocket } from '../context/SocketContext';

export const MobileSimulatorPage = () => {
  // Simulator Role & Screen Navigation
  const [deviceRole, setDeviceRole] = useState('SALESMAN'); // 'SALESMAN' or 'SHOP_OWNER'
  const [salesmanTab, setSalesmanTab] = useState('BEAT'); // 'BEAT', 'CATALOG', 'COLLECTIONS', 'KPIS'
  const [shopOwnerTab, setShopOwnerTab] = useState('DASHBOARD'); // 'DASHBOARD', 'ORDERS', 'LEDGER', 'REORDER'
  const [screen, setScreen] = useState('MAIN'); // 'MAIN', 'SHOP_DETAIL', 'TAKE_ORDER', 'COLLECT_PAYMENT', 'REGISTER_SHOP', 'EDIT_SHOP_GPS', 'WHATSAPP_SHARE'
  
  const [selectedShop, setSelectedShop] = useState(null);
  const [simulatedProximity, setSimulatedProximity] = useState('NEAR'); // 'NEAR' (<50m) or 'FAR' (>1km)

  // Data
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [myRoute, setMyRoute] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Cart for ordering
  const [cart, setCart] = useState({});
  const [billType, setBillType] = useState('NON_GST');
  const [orderNotes, setOrderNotes] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payBillType, setPayBillType] = useState('NON_GST');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');

  // Register shop form
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Morbi');
  const [newAddress, setNewAddress] = useState('');
  const [newRouteId, setNewRouteId] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Salesman Edit Shop & GPS Re-Pin Modal
  const [editShopFormData, setEditShopFormData] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    altPhone: '',
    address: '',
    city: '',
    latitude: 22.8123,
    longitude: 70.8354,
  });

  // WhatsApp bill/receipt share modal state
  const [whatsAppData, setWhatsAppData] = useState(null);

  // In-simulator status message toast
  const [simAlert, setSimAlert] = useState(null);

  const showSimToast = (msg, type = 'success') => {
    setSimAlert({ msg, type });
    setTimeout(() => setSimAlert(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const lat = simulatedProximity === 'NEAR' ? 22.8123 : 22.845;
      const lng = simulatedProximity === 'NEAR' ? 70.8354 : 70.89;

      const [sRes, pRes, rRes] = await Promise.all([
        shopsAPI.getAll({ salesmanLat: lat, salesmanLng: lng }),
        productsAPI.getAll(),
        routesAPI.getAll(),
      ]);

      if (sRes.data.success) {
        setShops(sRes.data.shops || []);
        if (sRes.data.shops?.length > 0 && !selectedShop) {
          setSelectedShop(sRes.data.shops[0]);
        }
      }
      if (pRes.data.success) setProducts(pRes.data.products || []);
      if (rRes.data.success && rRes.data.routes?.length > 0) {
        setAllRoutes(rRes.data.routes);
        if (!selectedRouteId) {
          setMyRoute(rRes.data.routes[0]);
          setSelectedRouteId(rRes.data.routes[0]._id);
        }
      }
    } catch (err) {
      console.error('Simulator load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [simulatedProximity]);

  // GPS Check-In handler
  const handleGpsCheckIn = async (shop) => {
    const lat = simulatedProximity === 'NEAR' ? shop.location?.latitude || 22.8123 : 22.85;
    const lng = simulatedProximity === 'NEAR' ? shop.location?.longitude || 70.8354 : 70.89;

    try {
      await visitsAPI.getAll(); // simulated call
      if (simulatedProximity === 'NEAR') {
        showSimToast(`📍 GPS Verified (28m from ${shop.shopName})! Visit recorded.`, 'success');
      } else {
        showSimToast(`⚠️ Warning: 1.4km away from ${shop.shopName}! Flagged for review.`, 'warning');
      }
    } catch (e) {
      showSimToast('Check-in logged', 'success');
    }
  };

  // Cart helpers
  const handleUpdateCart = (prodId, delta, boxQty = 1) => {
    setCart((prev) => {
      const cur = prev[prodId] || 0;
      const next = Math.max(0, cur + delta * boxQty);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      }
      return { ...prev, [prodId]: next };
    });
  };

  // Calculate order totals
  let subtotal = 0;
  let gstAmount = 0;
  Object.entries(cart).forEach(([pId, qty]) => {
    const prod = products.find((p) => p._id === pId);
    if (prod) {
      const line = prod.basePrice * qty;
      subtotal += line;
      if (billType === 'GST') {
        gstAmount += Math.round((line * (prod.gstPercentage || 18)) / 100);
      }
    }
  });
  const totalAmount = subtotal + gstAmount;

  // Submit order
  const handlePunchOrder = async () => {
    if (Object.keys(cart).length === 0) {
      showSimToast('Select at least 1 product', 'error');
      return;
    }

    const items = Object.entries(cart).map(([productId, quantity]) => {
      const p = products.find((prod) => prod._id === productId);
      return {
        productId,
        quantity,
        boxCount: Math.floor(quantity / (p.boxQuantity || 1)),
        customPrice: p.basePrice,
      };
    });

    try {
      const res = await ordersAPI.create({
        shopId: selectedShop._id,
        billType,
        items,
        dispatchNotes: orderNotes || 'Urgent wholesale delivery',
      });

      if (res.data.success) {
        showSimToast(`🚀 Order ${res.data.order.orderNumber} sent to Warehouse!`, 'success');
        
        // Prepare WhatsApp message
        setWhatsAppData({
          type: 'ORDER',
          shop: selectedShop,
          orderNumber: res.data.order.orderNumber,
          billType,
          totalAmount,
          itemCount: Object.keys(cart).length,
        });

        setCart({});
        setOrderNotes('');
        setScreen('WHATSAPP_SHARE');
        await loadData();
      }
    } catch (err) {
      showSimToast(err.response?.data?.message || 'Order failed', 'error');
    }
  };

  // Record payment
  const handleRecordPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      showSimToast('Enter valid amount', 'error');
      return;
    }

    try {
      const res = await paymentsAPI.record({
        shopId: selectedShop._id,
        billType: payBillType,
        amount: amt,
        mode: payMode,
        chequeNumber: payMode === 'CHEQUE' ? chequeNo : undefined,
        chequeBank: payMode === 'CHEQUE' ? chequeBank : undefined,
      });

      if (res.data.success) {
        showSimToast(`💵 Receipt ${res.data.payment.receiptNumber} generated! ₹${amt} recorded.`, 'success');
        
        setWhatsAppData({
          type: 'PAYMENT',
          shop: selectedShop,
          receiptNumber: res.data.payment.receiptNumber,
          billType: payBillType,
          amount: amt,
          mode: payMode,
        });

        setPayAmount('');
        setChequeNo('');
        setChequeBank('');
        setScreen('WHATSAPP_SHARE');
        await loadData();
      }
    } catch (err) {
      showSimToast(err.response?.data?.message || 'Payment error', 'error');
    }
  };

  // Register new shop
  const handleRegisterShop = async (e) => {
    e.preventDefault();
    try {
      const res = await shopsAPI.create({
        shopName: newShopName,
        ownerName: newOwnerName,
        phone: newPhone,
        city: newCity,
        address: newAddress,
        routeId: newRouteId || undefined,
        latitude: simulatedProximity === 'NEAR' ? 22.8123 : 22.845,
        longitude: simulatedProximity === 'NEAR' ? 70.8354 : 70.89,
      });

      if (res.data.success) {
        setCreatedCredentials(res.data.credentials);
        showSimToast(`🎉 Shop registered! Login ID created for ${newOwnerName}.`, 'success');
        await loadData();
      }
    } catch (err) {
      showSimToast(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  // Open Salesman Edit Shop Modal
  const handleOpenEditShop = (shop) => {
    setEditShopFormData({
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      phone: shop.phone,
      altPhone: shop.altPhone || '',
      address: shop.address,
      city: shop.city,
      latitude: shop.location?.latitude || 22.8123,
      longitude: shop.location?.longitude || 70.8354,
    });
    setScreen('EDIT_SHOP_GPS');
  };

  // Save Salesman Edit Shop & GPS
  const handleSaveEditShop = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editShopFormData,
        location: {
          latitude: parseFloat(editShopFormData.latitude),
          longitude: parseFloat(editShopFormData.longitude),
        },
      };
      const res = await shopsAPI.update(selectedShop._id, payload);
      if (res.data.success) {
        setSelectedShop(res.data.shop);
        showSimToast('✅ Shop details & GPS location updated!', 'success');
        setScreen('SHOP_DETAIL');
        await loadData();
      }
    } catch (err) {
      showSimToast(err.response?.data?.message || 'Failed to update shop details', 'error');
    }
  };

  // Pin current GPS
  const handleRepinCurrentGps = () => {
    const lat = simulatedProximity === 'NEAR' ? 22.8142 : 22.848;
    const lng = simulatedProximity === 'NEAR' ? 70.8385 : 70.892;
    setEditShopFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    showSimToast(`📍 GPS Re-Pinned to current coordinates: ${lat}, ${lng}`, 'success');
  };

  // Generate WhatsApp Share Link
  const getWhatsAppShareUrl = () => {
    if (!whatsAppData) return '';
    let msg = '';
    const phone = whatsAppData.shop?.phone || '919898011111';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const recipient = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    if (whatsAppData.type === 'ORDER') {
      msg = `*SHIVAM MARKETING - ORDER CONFIRMATION*\n------------------------------\n🏪 *Shop:* ${whatsAppData.shop?.shopName}\n📄 *Order No:* ${whatsAppData.orderNumber}\n📑 *Bill Type:* ${whatsAppData.billType === 'GST' ? 'GST Invoice (+18%)' : 'Without GST (Rough Cash)'}\n📦 *Total Items:* ${whatsAppData.itemCount}\n💰 *Total Amount:* ₹${whatsAppData.totalAmount.toLocaleString()}\n🚚 *Status:* PUNCHED TO WAREHOUSE\n------------------------------\nThank you for your business!`;
    } else {
      msg = `*SHIVAM MARKETING - PAYMENT RECEIPT*\n------------------------------\n🏪 *Shop:* ${whatsAppData.shop?.shopName}\n🧾 *Receipt No:* ${whatsAppData.receiptNumber}\n📑 *Book:* ${whatsAppData.billType === 'GST' ? 'GST Official Ledger' : 'Rough Cash Ledger'}\n💵 *Amount Received:* ₹${whatsAppData.amount.toLocaleString()}\n💳 *Mode:* ${whatsAppData.mode}\n✅ *Status:* RECEIVED & CREDITED\n------------------------------\nThank you for the prompt payment!`;
    }

    return `https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Interactive Mobile Field Sales Simulator
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test the complete Salesman Android App & Shop Owner portal with GPS verification, 1-tap WhatsApp digital bills, and dispatch tracking.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Simulated GPS Location Toggle */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 px-2 font-semibold">Simulate GPS:</span>
            <button
              onClick={() => setSimulatedProximity('NEAR')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                simulatedProximity === 'NEAR'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📍 At Shop (&lt;50m)
            </button>
            <button
              onClick={() => setSimulatedProximity('FAR')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                simulatedProximity === 'FAR'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚗 Away (1.4km)
            </button>
          </div>

          {/* Role Mode Selector */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => {
                setDeviceRole('SALESMAN');
                setScreen('MAIN');
                setSalesmanTab('BEAT');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                deviceRole === 'SALESMAN'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Salesman App</span>
            </button>
            <button
              onClick={() => {
                setDeviceRole('SHOP_OWNER');
                setScreen('MAIN');
                setShopOwnerTab('DASHBOARD');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                deviceRole === 'SHOP_OWNER'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Shop Owner App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Simulator Viewport */}
      <div className="flex justify-center">
        {/* Smartphone Shell Frame */}
        <div className="w-full max-w-[430px] bg-slate-950 rounded-[46px] p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50">
          {/* Top Speaker / Dynamic Island */}
          <div className="w-28 h-5 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center gap-2 border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
            <div className="w-8 h-1.5 rounded-full bg-slate-800" />
          </div>

          {/* Phone Display Screen */}
          <div className="bg-slate-950 rounded-[34px] overflow-hidden border border-slate-800/80 min-h-[660px] max-h-[720px] flex flex-col relative text-slate-100 font-sans">
            {/* Status Bar */}
            <div className="bg-slate-900 px-5 py-1.5 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80">
              <span className="font-bold text-white">09:41 AM</span>
              <div className="flex items-center gap-2">
                <span>📶 5G</span>
                <span>🔋 94%</span>
              </div>
            </div>

            {/* In-App Screen Header */}
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              {screen !== 'MAIN' ? (
                <button
                  onClick={() => {
                    if (screen === 'TAKE_ORDER' || screen === 'COLLECT_PAYMENT' || screen === 'EDIT_SHOP_GPS') {
                      setScreen('SHOP_DETAIL');
                    } else {
                      setScreen('MAIN');
                    }
                  }}
                  className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1"
                >
                  &larr; Back
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold text-white tracking-wide">
                    {deviceRole === 'SALESMAN' ? 'SHIVAM FIELD SALES' : 'B2B WHOLESALE PORTAL'}
                  </span>
                </div>
              )}

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                deviceRole === 'SALESMAN'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {deviceRole === 'SALESMAN' ? '👔 Ramesh (Sales)' : '🏪 Jayeshbhai (Owner)'}
              </span>
            </div>

            {/* In-App Toast Notification */}
            {simAlert && (
              <div
                className={`absolute top-14 left-3 right-3 z-50 p-2.5 rounded-xl text-xs font-bold shadow-xl border ${
                  simAlert.type === 'success'
                    ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500'
                    : 'bg-amber-950/95 text-amber-300 border-amber-500'
                }`}
              >
                {simAlert.msg}
              </div>
            )}

            {/* SCREEN: SALESMAN MODE */}
            {deviceRole === 'SALESMAN' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 1. SALESMAN MAIN SCREEN WITH BOTTOM TABS */}
                {screen === 'MAIN' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* TAB 1: TODAY'S BEAT */}
                    {salesmanTab === 'BEAT' && (() => {
                      const activeRoute = allRoutes.find((r) => r._id === selectedRouteId) || myRoute;
                      const filteredShops = activeRoute && selectedRouteId !== 'ALL'
                        ? shops.filter((s) => 
                            (s.routeId?._id && s.routeId._id === activeRoute._id) ||
                            activeRoute.cities?.some((c) => c.toLowerCase() === s.city?.toLowerCase())
                          )
                        : shops;

                      return (
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                          {/* Multi-Beat Selector (If salesman covers 2+ beats) */}
                          {allRoutes.length > 1 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Assigned Beats:
                              </span>
                              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                {allRoutes.map((r) => {
                                  const isSelected = selectedRouteId === r._id;
                                  return (
                                    <button
                                      key={r._id}
                                      onClick={() => {
                                        setSelectedRouteId(r._id);
                                        setMyRoute(r);
                                      }}
                                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                                        isSelected
                                          ? 'bg-sky-600 border-sky-400 text-white shadow'
                                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      📍 {r.name.split(' ')[0]} ({r.cities.slice(0, 2).join('+')})
                                    </button>
                                  );
                                })}
                                <button
                                  onClick={() => {
                                    setSelectedRouteId('ALL');
                                    setMyRoute(null);
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                                    selectedRouteId === 'ALL'
                                      ? 'bg-sky-600 border-sky-400 text-white shadow'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  🌐 All Shops ({shops.length})
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Salesman Route KPI Header */}
                          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-950/80 via-slate-900 to-slate-900 border border-sky-800/40">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                                {activeRoute?.name || 'Active Route'}
                              </span>
                              <span className="text-[10px] bg-sky-600 text-white font-bold px-2 py-0.5 rounded-full">
                                {filteredShops.length} Shops
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Cities: <b className="text-slate-200">{activeRoute?.cities?.join(', ') || 'Morbi, Wankaner, Rajkot'}</b>
                            </p>
                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Visits Done: <b className="text-white">4 / {filteredShops.length}</b></span>
                              <span className="text-emerald-400 font-bold">Collected Today: ₹35,000</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                              Beat Shops List
                            </span>
                            <button
                              onClick={() => setScreen('REGISTER_SHOP')}
                              className="text-[11px] font-bold text-sky-400 hover:underline flex items-center gap-1"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>+ Onboard Shop</span>
                            </button>
                          </div>

                          {/* Shop Cards List */}
                          <div className="space-y-2.5">
                            {filteredShops.map((shop) => {
                              const isNear = simulatedProximity === 'NEAR';
                              const totalDue = (shop.gstBalance || 0) + (shop.nonGstBalance || 0);

                              return (
                                <div
                                  key={shop._id}
                                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-bold text-white text-xs leading-tight">
                                        {shop.shopName}
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {shop.ownerName} • {shop.city}
                                      </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                      {shop.city}
                                    </span>
                                  </div>

                                  {/* Distance & Map Proximity */}
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span
                                      className={`font-bold flex items-center gap-1 ${
                                        isNear ? 'text-emerald-400' : 'text-amber-400'
                                      }`}
                                    >
                                      <MapPin className="w-3 h-3" />
                                      <span>
                                        {isNear ? '28m away (At Shop)' : '1.4km away'}
                                      </span>
                                    </span>

                                    <a
                                      href={`https://www.google.com/maps?q=${shop.location?.latitude || 22.81},${shop.location?.longitude || 70.83}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sky-400 hover:underline text-[10px] font-semibold flex items-center gap-0.5"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      <span>Directions</span>
                                    </a>
                                  </div>

                                  {/* Dual Balance Matrix */}
                                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-center text-[10px]">
                                    <div>
                                      <span className="text-slate-500 block">GST Due</span>
                                      <span className="font-bold text-emerald-400">
                                        ₹{shop.gstBalance?.toLocaleString() || 0}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Rough Due</span>
                                      <span className="font-bold text-amber-400">
                                        ₹{shop.nonGstBalance?.toLocaleString() || 0}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Total Due</span>
                                      <span className="font-bold text-white">
                                        ₹{totalDue.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Buttons */}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                      onClick={() => handleGpsCheckIn(shop)}
                                      className="flex-1 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1"
                                    >
                                      <MapPin className="w-3 h-3" />
                                      <span>GPS Check-In</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedShop(shop);
                                        setScreen('SHOP_DETAIL');
                                      }}
                                      className="flex-1 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow flex items-center justify-center gap-1"
                                    >
                                      <span>Visit Shop</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* TAB 2: PRODUCT CATALOG */}
                    {salesmanTab === 'CATALOG' && (
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search sanitary, pipes, valves..."
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="space-y-2">
                          {products
                            .filter((p) => p.name?.toLowerCase().includes(catalogSearch.toLowerCase()) || p.brand?.toLowerCase().includes(catalogSearch.toLowerCase()))
                            .map((p) => (
                              <div key={p._id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-bold text-white">{p.name}</div>
                                  <div className="text-[10px] text-slate-400">{p.brand} • {p.boxQuantity} pcs/box • HSN: {p.hsnCode || '3917'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-extrabold text-emerald-400 text-sm">₹{p.basePrice}</div>
                                  <div className="text-[9px] text-slate-500">Stock: {p.stockQuantity ?? 120} pcs</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: COLLECTIONS SUMMARY */}
                    {salesmanTab === 'COLLECTIONS' && (
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/40 space-y-2">
                          <span className="text-[10px] font-bold text-emerald-300 uppercase">Today's Total Cash In Hand</span>
                          <div className="text-2xl font-extrabold text-emerald-400">₹35,000</div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
                            <div>Rough Cash: <b className="text-amber-400">₹25,000</b></div>
                            <div>GST Cheque/UPI: <b className="text-emerald-400">₹10,000</b></div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Today's Receipts</span>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white">Somnath Sanitary</div>
                              <div className="text-[10px] text-slate-400">RCP-2026-0001 • Cash</div>
                            </div>
                            <span className="font-extrabold text-emerald-400">₹20,000</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white">Shreeji Traders</div>
                              <div className="text-[10px] text-slate-400">RCP-2026-0002 • UPI (GST)</div>
                            </div>
                            <span className="font-extrabold text-emerald-400">₹15,000</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: KPIS & TARGETS */}
                    {salesmanTab === 'KPIS' && (
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-800/40 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-300 text-xs">Daily Performance Ring</span>
                            <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">Top Tier</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Collection Target</span>
                              <span className="font-bold text-emerald-400">₹35,000 / ₹50,000 (70%)</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full w-[70%]" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Shop Visits</span>
                              <span className="font-bold text-sky-400">4 / 6 Shops (66%)</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-sky-500 h-full rounded-full w-[66%]" />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">New Shops Onboarded</span>
                            <span className="font-bold text-white text-base mt-1 block">3 this week</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Pending Orders Value</span>
                            <span className="font-bold text-white text-base mt-1 block">₹84,200</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Salesman Bottom Navigation Bar */}
                    <div className="bg-slate-900 border-t border-slate-800 px-2 py-2 flex items-center justify-around text-[10px]">
                      <button
                        onClick={() => setSalesmanTab('BEAT')}
                        className={`flex flex-col items-center gap-1 ${
                          salesmanTab === 'BEAT' ? 'text-sky-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Today Beat</span>
                      </button>
                      <button
                        onClick={() => setSalesmanTab('CATALOG')}
                        className={`flex flex-col items-center gap-1 ${
                          salesmanTab === 'CATALOG' ? 'text-sky-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Catalog</span>
                      </button>
                      <button
                        onClick={() => setSalesmanTab('COLLECTIONS')}
                        className={`flex flex-col items-center gap-1 ${
                          salesmanTab === 'COLLECTIONS' ? 'text-sky-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Collections</span>
                      </button>
                      <button
                        onClick={() => setSalesmanTab('KPIS')}
                        className={`flex flex-col items-center gap-1 ${
                          salesmanTab === 'KPIS' ? 'text-sky-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        <span>My KPIs</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. SALESMAN SHOP DETAIL & DUAL LEDGER SCREEN */}
                {screen === 'SHOP_DETAIL' && selectedShop && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-sm text-white">{selectedShop.shopName}</h3>
                          <p className="text-[11px] text-slate-400">
                            Prop: {selectedShop.ownerName} • {selectedShop.phone}
                          </p>
                          <p className="text-[11px] text-slate-500">📍 {selectedShop.address}, {selectedShop.city}</p>
                        </div>
                        {/* Salesman Edit Shop & Re-Pin GPS Button */}
                        <button
                          onClick={() => handleOpenEditShop(selectedShop)}
                          className="px-2 py-1 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit / GPS</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-center text-[10px]">
                        <div>
                          <span className="text-slate-500 block">GST Due</span>
                          <span className="font-bold text-emerald-400 text-xs">
                            ₹{selectedShop.gstBalance?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Rough Due</span>
                          <span className="font-bold text-amber-400 text-xs">
                            ₹{selectedShop.nonGstBalance?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Total Due</span>
                          <span className="font-bold text-white text-xs">
                            ₹{((selectedShop.gstBalance || 0) + (selectedShop.nonGstBalance || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Primary Field Sales Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setCart({});
                          setScreen('TAKE_ORDER');
                        }}
                        className="py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Take Order</span>
                      </button>

                      <button
                        onClick={() => {
                          setPayAmount('');
                          setScreen('COLLECT_PAYMENT');
                        }}
                        className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Collect Payment</span>
                      </button>
                    </div>

                    {/* Quick Call & WhatsApp Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${selectedShop.phone}`}
                        className="py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-sky-400" />
                        <span>Call Owner</span>
                      </a>
                      <a
                        href={`https://wa.me/91${selectedShop.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedShop.ownerName}, regarding your account balance of ₹${((selectedShop.gstBalance || 0) + (selectedShop.nonGstBalance || 0)).toLocaleString()} at Shivam Marketing.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 hover:border-emerald-600 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {/* Bill History Mini Summary */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Recent Transactions
                      </span>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-mono text-[11px]">ORD-2026-0001</span>
                          <span className="font-bold text-emerald-400">GST Bill: ₹29,642</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-mono text-[11px]">RCP-2026-0001</span>
                          <span className="font-bold text-amber-400">Rough Cash: -₹15,000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SALESMAN TAKE NEW ORDER SCREEN */}
                {screen === 'TAKE_ORDER' && selectedShop && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      {/* Bill Type Selector */}
                      <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                          Select Billing Mode:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setBillType('NON_GST')}
                            className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              billType === 'NON_GST'
                                ? 'bg-amber-600 border-amber-500 text-white shadow'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            Without GST (Rough)
                          </button>
                          <button
                            onClick={() => setBillType('GST')}
                            className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              billType === 'GST'
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            GST Tax Bill (+18%)
                          </button>
                        </div>
                      </div>

                      {/* Product Catalog Items */}
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {products.slice(0, 6).map((prod) => {
                          const qty = cart[prod._id] || 0;
                          const isOutOfStock = prod.isOutOfStock;

                          return (
                            <div
                              key={prod._id}
                              className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 ${
                                isOutOfStock ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-bold text-white text-xs">{prod.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {prod.brand} • Box: {prod.boxQuantity} {prod.uom}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-extrabold text-white text-xs">₹{prod.basePrice}</span>
                                  <span className="block text-[9px] text-slate-500">
                                    {billType === 'GST' ? '+18%' : 'Net'}
                                  </span>
                                </div>
                              </div>

                              {!isOutOfStock ? (
                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    onClick={() => handleUpdateCart(prod._id, 1, prod.boxQuantity)}
                                    className="px-2 py-0.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold"
                                  >
                                    +1 Box ({prod.boxQuantity} pcs)
                                  </button>

                                  <div className="flex items-center gap-2 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                                    <button
                                      onClick={() => handleUpdateCart(prod._id, -1, 1)}
                                      className="text-slate-400 hover:text-white font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sky-400 text-xs min-w-[24px] text-center">
                                      {qty}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateCart(prod._id, 1, 1)}
                                      className="text-slate-400 hover:text-white font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-bold block">
                                  ⚠️ Out of Stock
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dispatch Notes */}
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Dispatch notes for warehouse packing..."
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>

                    {/* Bottom Cart Action Bar */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Total ({Object.keys(cart).length} Items):
                        </span>
                        <span className="text-base font-extrabold text-emerald-400">
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={handlePunchOrder}
                        className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/30 active:scale-95"
                      >
                        Punch Order &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. SALESMAN COLLECT PAYMENT SCREEN */}
                {screen === 'COLLECT_PAYMENT' && selectedShop && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Select Target Ledger Book:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setPayBillType('NON_GST')}
                          className={`py-1.5 rounded-xl text-xs font-bold border ${
                            payBillType === 'NON_GST'
                              ? 'bg-amber-600 border-amber-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          Rough Due: ₹{selectedShop.nonGstBalance?.toLocaleString() || 0}
                        </button>
                        <button
                          onClick={() => setPayBillType('GST')}
                          className={`py-1.5 rounded-xl text-xs font-bold border ${
                            payBillType === 'GST'
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          GST Due: ₹{selectedShop.gstBalance?.toLocaleString() || 0}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Collection Amount (₹):
                      </label>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-extrabold text-lg rounded-xl px-3 py-2.5 focus:outline-none"
                      />
                    </div>

                    {/* Mode Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Payment Mode:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['CASH', 'CHEQUE', 'UPI'].map((m) => (
                          <button
                            key={m}
                            onClick={() => setPayMode(m)}
                            className={`py-1.5 rounded-xl text-xs font-bold border ${
                              payMode === m
                                ? 'bg-sky-600 border-sky-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {m === 'CASH' ? '💵 Cash' : m === 'CHEQUE' ? '🏦 Cheque' : '📱 UPI'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {payMode === 'CHEQUE' && (
                      <div className="space-y-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <input
                          type="text"
                          placeholder="Cheque No (6 digits)"
                          value={chequeNo}
                          onChange={(e) => setChequeNo(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2"
                        />
                        <input
                          type="text"
                          placeholder="Bank Name (e.g. HDFC Bank)"
                          value={chequeBank}
                          onChange={(e) => setChequeBank(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleRecordPayment}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/30 active:scale-95 mt-2"
                    >
                      Record Collection & Generate Receipt &rarr;
                    </button>
                  </div>
                )}

                {/* 5. SALESMAN EDIT SHOP & GPS RE-PIN MODAL SCREEN */}
                {screen === 'EDIT_SHOP_GPS' && selectedShop && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <span className="font-bold text-white text-xs">Edit Shop & Update GPS</span>
                      <button
                        onClick={() => setScreen('SHOP_DETAIL')}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditShop} className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Shop Name:</label>
                        <input
                          type="text"
                          required
                          value={editShopFormData.shopName}
                          onChange={(e) => setEditShopFormData({ ...editShopFormData, shopName: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Owner / Contact Name:</label>
                        <input
                          type="text"
                          required
                          value={editShopFormData.ownerName}
                          onChange={(e) => setEditShopFormData({ ...editShopFormData, ownerName: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-0.5">Phone:</label>
                          <input
                            type="text"
                            required
                            value={editShopFormData.phone}
                            onChange={(e) => setEditShopFormData({ ...editShopFormData, phone: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-0.5">Alt Phone:</label>
                          <input
                            type="text"
                            value={editShopFormData.altPhone}
                            onChange={(e) => setEditShopFormData({ ...editShopFormData, altPhone: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Address:</label>
                        <input
                          type="text"
                          value={editShopFormData.address}
                          onChange={(e) => setEditShopFormData({ ...editShopFormData, address: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                        />
                      </div>

                      {/* GPS Coordinates & Re-Pin Tool */}
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-300 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-sky-400" />
                            <span>GPS Geofence Pin</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleRepinCurrentGps}
                            className="px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] flex items-center gap-1"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Pin Current GPS</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-400">
                          <div>Lat: {editShopFormData.latitude}</div>
                          <div>Lng: {editShopFormData.longitude}</div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold mt-2"
                      >
                        Save Shop Updates &rarr;
                      </button>
                    </form>
                  </div>
                )}

                {/* 6. SALESMAN REGISTER NEW SHOP SCREEN */}
                {screen === 'REGISTER_SHOP' && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                    {createdCredentials ? (
                      <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
                        <span className="text-2xl">🎉</span>
                        <h4 className="font-bold text-white text-sm">Shop Onboarded!</h4>
                        <p className="text-[11px] text-slate-300">
                          Share these credentials with the shop owner for mobile login:
                        </p>
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-left text-xs space-y-1">
                          <div><b>User ID:</b> {createdCredentials.phone}</div>
                          <div><b>Password:</b> {createdCredentials.password}</div>
                        </div>
                        <button
                          onClick={() => {
                            setCreatedCredentials(null);
                            setScreen('MAIN');
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold"
                        >
                          Return to Beat
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRegisterShop} className="space-y-2.5">
                        <div className="p-2 rounded-xl bg-sky-950/50 border border-sky-800/40 flex items-center gap-2 text-[11px] text-sky-300 font-bold">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>GPS Pin: 22.8130° N, 70.8360° E (Acquired)</span>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-0.5">Shop Name:</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Somnath Sanitary"
                            value={newShopName}
                            onChange={(e) => setNewShopName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-0.5">Owner Name:</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rajeshbhai"
                            value={newOwnerName}
                            onChange={(e) => setNewOwnerName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-0.5">Phone (Mobile ID):</label>
                          <input
                            type="text"
                            required
                            placeholder="10-digit mobile"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-0.5">Assign Beat:</label>
                          <select
                            value={newRouteId}
                            onChange={(e) => setNewRouteId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                          >
                            <option value="">Default Route</option>
                            {allRoutes.map((r) => (
                              <option key={r._id} value={r._id}>{r.name} ({r.cities?.join(', ')})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-0.5">Address:</label>
                          <input
                            type="text"
                            required
                            placeholder="Shop address"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold mt-2"
                        >
                          Enrol Shop & Generate ID &rarr;
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* 7. 1-TAP WHATSAPP BILL / RECEIPT SHARE MODAL */}
                {screen === 'WHATSAPP_SHARE' && whatsAppData && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-center flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <Send className="w-6 h-6" />
                      </div>
                      <h4 className="font-extrabold text-white text-sm">
                        {whatsAppData.type === 'ORDER' ? 'Order Punched Successfully!' : 'Payment Recorded!'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Send digital {whatsAppData.type === 'ORDER' ? 'order confirmation' : 'payment receipt'} directly to the shop owner's WhatsApp in 1-tap:
                      </p>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left font-mono text-[11px] text-slate-300 space-y-1">
                        <div><b>Shop:</b> {whatsAppData.shop?.shopName}</div>
                        <div><b>Owner:</b> {whatsAppData.shop?.ownerName} ({whatsAppData.shop?.phone})</div>
                        {whatsAppData.type === 'ORDER' ? (
                          <>
                            <div><b>Order No:</b> {whatsAppData.orderNumber}</div>
                            <div><b>Amount:</b> ₹{whatsAppData.totalAmount.toLocaleString()}</div>
                          </>
                        ) : (
                          <>
                            <div><b>Receipt No:</b> {whatsAppData.receiptNumber}</div>
                            <div><b>Amount Received:</b> ₹{whatsAppData.amount.toLocaleString()} ({whatsAppData.mode})</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <a
                        href={getWhatsAppShareUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send WhatsApp Digital Bill &rarr;</span>
                      </a>
                      <button
                        onClick={() => setScreen('MAIN')}
                        className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold"
                      >
                        Back to Beat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCREEN: SHOP OWNER MODE */}
            {deviceRole === 'SHOP_OWNER' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 1. SHOP OWNER DASHBOARD */}
                {shopOwnerTab === 'DASHBOARD' && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                    {/* Header Shop Card */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white">Shri Krishna Hardware</span>
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                          Verified Shop
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Proprietor: Jayeshbhai Shah • Morbi</p>

                      {/* Credit Limit Health Gauge */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Credit Limit: <b className="text-slate-200">₹1,50,000</b></span>
                          <span className="text-emerald-400 font-bold">₹80,500 Available</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full rounded-full w-[46%]" />
                        </div>
                      </div>

                      {/* Dual Account Balance Matrix */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                        <div>
                          <span className="text-slate-500 text-[10px] block">GST Tax Due</span>
                          <span className="font-extrabold text-emerald-400 text-sm">₹24,500</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Rough Cash Due</span>
                          <span className="font-extrabold text-amber-400 text-sm">₹45,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Order Dispatch Timeline Widget */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-sky-400" />
                          <span>Active Delivery Tracking</span>
                        </span>
                        <span className="text-[10px] font-mono text-sky-400 font-bold">ORD-2026-0001</span>
                      </div>

                      {/* 4-Step Dispatch Visual Timeline */}
                      <div className="grid grid-cols-4 gap-1 text-center text-[9px] pt-1">
                        <div className="space-y-1">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto font-bold">✓</div>
                          <span className="font-bold text-emerald-400 block">Punched</span>
                          <span className="text-slate-500 block">09:15 AM</span>
                        </div>
                        <div className="space-y-1">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto font-bold">✓</div>
                          <span className="font-bold text-emerald-400 block">Packed</span>
                          <span className="text-slate-500 block">09:30 AM</span>
                        </div>
                        <div className="space-y-1">
                          <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center mx-auto font-bold animate-pulse">🚚</div>
                          <span className="font-bold text-sky-400 block">On Route</span>
                          <span className="text-slate-500 block">Driver: Amit</span>
                        </div>
                        <div className="space-y-1">
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto font-bold">○</div>
                          <span className="text-slate-500 block">Delivered</span>
                          <span className="text-slate-500 block">Est: 11:30 AM</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick 1-Tap Re-Order Card */}
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-800/40 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">Need Quick Restock?</div>
                        <div className="text-[10px] text-slate-400">Re-order past CPVC & Jaquar items</div>
                      </div>
                      <button
                        onClick={() => setShopOwnerTab('REORDER')}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow"
                      >
                        1-Click Re-Order
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. SHOP OWNER ORDERS LIST */}
                {shopOwnerTab === 'ORDERS' && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                      Order History & Dispatches
                    </span>

                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">ORD-2026-0001</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                          ON ROUTE FOR DELIVERY
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">• CPVC Pipe 1 inch &times; 40 pcs (2 Boxes)</p>
                      <p className="text-[11px] text-slate-400">• Jaquar Bib Cock &times; 24 pcs (2 Boxes)</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-500">GST Invoice</span>
                        <span className="font-extrabold text-white">₹29,642</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">ORD-2026-0000</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          DELIVERED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">• PVC Conduit Pipe &times; 100 pcs (5 Boxes)</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-500">Rough Bill</span>
                        <span className="font-extrabold text-white">₹18,500</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SHOP OWNER DUAL LEDGER */}
                {shopOwnerTab === 'LEDGER' && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                      Account Statement & Passbook
                    </span>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">Payment Credited</span>
                        <span className="font-bold text-emerald-400">-₹15,000</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>RCP-2026-0001 (Cash)</span>
                        <span>Yesterday</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">Tax Invoice Debited</span>
                        <span className="font-bold text-rose-400">+₹29,642</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>ORD-2026-0001 (GST 18%)</span>
                        <span>2 days ago</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SHOP OWNER FAST REORDER */}
                {shopOwnerTab === 'REORDER' && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="font-bold text-white text-xs block">Fast Wholesale Re-Order</span>
                      <p className="text-[11px] text-slate-400">Punches direct restock request to Shivam Warehouse dispatcher.</p>

                      {products.slice(0, 4).map((prod) => (
                        <div key={prod._id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-white">{prod.name}</div>
                            <div className="text-[10px] text-slate-400">{prod.brand} • Box: {prod.boxQuantity} pcs</div>
                          </div>
                          <button
                            onClick={() => showSimToast(`📦 Added ${prod.name} box to restock order!`, 'success')}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px]"
                          >
                            + Re-Order Box
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        showSimToast('🚀 Restock request sent to Shivam Marketing dispatch desk!', 'success');
                        setShopOwnerTab('DASHBOARD');
                      }}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                    >
                      Send Restock Order to Shivam &rarr;
                    </button>
                  </div>
                )}

                {/* Shop Owner Bottom Navigation Bar */}
                <div className="bg-slate-900 border-t border-slate-800 px-2 py-2 flex items-center justify-around text-[10px]">
                  <button
                    onClick={() => setShopOwnerTab('DASHBOARD')}
                    className={`flex flex-col items-center gap-1 ${
                      shopOwnerTab === 'DASHBOARD' ? 'text-indigo-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => setShopOwnerTab('ORDERS')}
                    className={`flex flex-col items-center gap-1 ${
                      shopOwnerTab === 'ORDERS' ? 'text-indigo-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>My Orders</span>
                  </button>
                  <button
                    onClick={() => setShopOwnerTab('LEDGER')}
                    className={`flex flex-col items-center gap-1 ${
                      shopOwnerTab === 'LEDGER' ? 'text-indigo-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ledger</span>
                  </button>
                  <button
                    onClick={() => setShopOwnerTab('REORDER')}
                    className={`flex flex-col items-center gap-1 ${
                      shopOwnerTab === 'REORDER' ? 'text-indigo-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Re-Order</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
