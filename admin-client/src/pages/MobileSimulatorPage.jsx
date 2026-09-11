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
  // Simulator state
  const [deviceRole, setDeviceRole] = useState('SALESMAN'); // 'SALESMAN' or 'SHOP_OWNER'
  const [screen, setScreen] = useState('TODAY_BEAT'); // 'TODAY_BEAT', 'SHOP_DETAIL', 'TAKE_ORDER', 'COLLECT_PAYMENT', 'REGISTER_SHOP', 'SHOP_OWNER'
  const [selectedShop, setSelectedShop] = useState(null);
  const [simulatedProximity, setSimulatedProximity] = useState('NEAR'); // 'NEAR' (<100m) or 'FAR' (>500m)

  // Data
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [myRoute, setMyRoute] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const [createdCredentials, setCreatedCredentials] = useState(null);

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
        setMyRoute(rRes.data.routes[0]);
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
      const res = await visitsAPI.getAll(); // simulated call
      if (simulatedProximity === 'NEAR') {
        showSimToast(`✅ GPS Proximity Verified (32m from ${shop.shopName})! Visit recorded.`, 'success');
      } else {
        showSimToast(`⚠️ Warning: You are 1,420m away from ${shop.shopName}! Flagged for audit.`, 'warning');
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
        showSimToast(`🚀 Order ${res.data.order.orderNumber} sent to Warehouse! Audio alert triggered.`, 'success');
        setCart({});
        setOrderNotes('');
        setScreen('SHOP_DETAIL');
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
        showSimToast(`💵 Receipt ${res.data.payment.receiptNumber} generated! ₹${amt} credited.`, 'success');
        setPayAmount('');
        setChequeNo('');
        setChequeBank('');
        setScreen('SHOP_DETAIL');
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
        latitude: 22.813,
        longitude: 70.836,
      });

      if (res.data.success) {
        setCreatedCredentials(res.data.credentials);
        showSimToast(`🎉 Shop registered! Credentials created for ${newOwnerName}.`, 'success');
        await loadData();
      }
    } catch (err) {
      showSimToast(err.response?.data?.message || 'Registration failed', 'error');
    }
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
            Test the complete Salesman Android App and Shop Owner portal workflows directly in your browser.
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
              📍 Near Shop (&lt;50m)
            </button>
            <button
              onClick={() => setSimulatedProximity('FAR')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                simulatedProximity === 'FAR'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚗 Far Away (1.4km)
            </button>
          </div>

          {/* Role Mode Selector */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => {
                setDeviceRole('SALESMAN');
                setScreen('TODAY_BEAT');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                deviceRole === 'SALESMAN'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👔 Salesman Mode
            </button>
            <button
              onClick={() => {
                setDeviceRole('SHOP_OWNER');
                setScreen('SHOP_OWNER');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                deviceRole === 'SHOP_OWNER'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏪 Shop Owner Mode
            </button>
          </div>
        </div>
      </div>

      {/* Main Simulator Viewport */}
      <div className="flex justify-center">
        {/* Smartphone Shell Frame */}
        <div className="w-full max-w-[420px] bg-slate-950 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50">
          {/* Top Speaker / Camera Notch */}
          <div className="w-32 h-5 bg-slate-900 rounded-full mx-auto mb-3 flex items-center justify-center gap-2 border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
            <div className="w-10 h-1.5 rounded-full bg-slate-800" />
          </div>

          {/* Phone Display Screen */}
          <div className="bg-slate-950 rounded-[32px] overflow-hidden border border-slate-800/80 min-h-[640px] max-h-[720px] flex flex-col relative text-slate-100 font-sans">
            {/* Status Bar */}
            <div className="bg-slate-900 px-5 py-2 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80">
              <span className="font-bold text-white">09:41 AM</span>
              <div className="flex items-center gap-2">
                <span>📶 5G</span>
                <span>🔋 92%</span>
              </div>
            </div>

            {/* In-App Screen Header */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              {screen !== 'TODAY_BEAT' && screen !== 'SHOP_OWNER' ? (
                <button
                  onClick={() => setScreen(screen === 'TAKE_ORDER' || screen === 'COLLECT_PAYMENT' ? 'SHOP_DETAIL' : 'TODAY_BEAT')}
                  className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1"
                >
                  &larr; Back
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold text-white tracking-wide">
                    {deviceRole === 'SALESMAN' ? 'SALASE FIELD SALES' : 'B2B SHOP OWNER PORTAL'}
                  </span>
                </div>
              )}

              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {deviceRole === 'SALESMAN' ? 'Ramesh (Salesman)' : 'Jayeshbhai (Owner)'}
              </span>
            </div>

            {/* In-App Toast Notification */}
            {simAlert && (
              <div
                className={`absolute top-16 left-3 right-3 z-50 p-2.5 rounded-xl text-xs font-bold shadow-xl border animate-bounce ${
                  simAlert.type === 'success'
                    ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500'
                    : 'bg-amber-950/95 text-amber-300 border-amber-500'
                }`}
              >
                {simAlert.msg}
              </div>
            )}

            {/* SCREEN 1: TODAY'S BEAT (Salesman Home) */}
            {screen === 'TODAY_BEAT' && deviceRole === 'SALESMAN' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Beat Header Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-900/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-extrabold text-white">
                      {myRoute?.name || 'Morbi - Wankaner Ceramic Beat'}
                    </span>
                    <span className="text-[10px] bg-sky-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Today's Beat
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Cities: <b className="text-slate-200">{myRoute?.cities?.join(', ') || 'Morbi, Wankaner'}</b>
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Target Shops: {shops.length}</span>
                    <span className="text-emerald-400 font-bold">Cash in Hand: ₹15,000</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Shops on Route (Nearest First)
                  </span>
                  <button
                    onClick={() => setScreen('REGISTER_SHOP')}
                    className="text-[11px] font-bold text-sky-400 hover:underline flex items-center gap-1"
                  >
                    + Enrol Shop
                  </button>
                </div>

                {/* Shop Cards List */}
                <div className="space-y-2.5">
                  {shops.map((shop) => {
                    const isNear = (shop.distanceMeters ?? 50) <= 150;
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
                              {simulatedProximity === 'NEAR' ? '32m away (At Shop)' : '1.4km away'}
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
                            className="flex-1 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                          >
                            📍 Check-In GPS
                          </button>
                          <button
                            onClick={() => {
                              setSelectedShop(shop);
                              setScreen('SHOP_DETAIL');
                            }}
                            className="flex-1 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow"
                          >
                            Orders & Ledger &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCREEN 2: SHOP DETAIL & DUAL LEDGER */}
            {screen === 'SHOP_DETAIL' && selectedShop && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <h3 className="font-extrabold text-sm text-white">{selectedShop.shopName}</h3>
                  <p className="text-[11px] text-slate-400">
                    Prop: {selectedShop.ownerName} • {selectedShop.phone}
                  </p>
                  <p className="text-[11px] text-slate-500">📍 {selectedShop.address}, {selectedShop.city}</p>

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
                    <span>Take New Order</span>
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

                {/* Bill History Mini Summary */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Recent Bills & Payments
                  </span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-mono">ORD-2026-0001</span>
                      <span className="font-bold text-emerald-400">GST Bill: ₹29,642</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-mono">RCP-2026-0001</span>
                      <span className="font-bold text-amber-400">Rough Cash: -₹15,000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 3: TAKE NEW ORDER */}
            {screen === 'TAKE_ORDER' && selectedShop && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
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
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
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
                    placeholder="Dispatch instructions for warehouse..."
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
                    Punch to Warehouse &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 4: COLLECT PAYMENT */}
            {screen === 'COLLECT_PAYMENT' && selectedShop && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
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
                  Record Collection & Issue Receipt &rarr;
                </button>
              </div>
            )}

            {/* SCREEN 5: REGISTER NEW SHOP */}
            {screen === 'REGISTER_SHOP' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
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
                        setScreen('TODAY_BEAT');
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

            {/* SCREEN 6: SHOP OWNER PORTAL */}
            {deviceRole === 'SHOP_OWNER' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Shri Krishna Hardware</span>
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                      Owner Portal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Proprietor: Jayeshbhai Shah</p>

                  <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <div>
                      <span className="text-slate-500 text-[10px] block">GST Balance</span>
                      <span className="font-extrabold text-emerald-400 text-sm">₹24,500</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Rough Due</span>
                      <span className="font-extrabold text-amber-400 text-sm">₹45,000</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Live Orders & Delivery Tracking
                  </span>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">ORD-2026-0001</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        PACKED IN WAREHOUSE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">• CPVC Pipe 1 inch &times; 40 pcs (2 Boxes)</p>
                    <p className="text-[11px] text-slate-400">• Jaquar Bib Cock &times; 24 pcs (2 Boxes)</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-500">GST Invoice</span>
                      <span className="font-extrabold text-white">₹29,642</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
