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
  PhoneCall,
  Radio,
  Image as ImageIcon,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import {
  shopsAPI,
  productsAPI,
  ordersAPI,
  paymentsAPI,
  routesAPI,
  authAPI,
  visitsAPI,
  categoriesAPI,
} from '../services/api';
import { useSocket } from '../context/SocketContext';

export const MobileSimulatorPage = () => {
  // Simulator Role & Screen Navigation
  const [deviceRole, setDeviceRole] = useState('SALESMAN'); // 'SALESMAN' or 'SHOP_OWNER'
  const [salesmanTab, setSalesmanTab] = useState('BEAT'); // 'BEAT', 'PHONE_SEARCH', 'CATALOG', 'COLLECTIONS', 'KPIS'
  const [shopOwnerTab, setShopOwnerTab] = useState('DASHBOARD'); // 'DASHBOARD', 'ORDERS', 'CATALOG', 'LEDGER'
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
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [shopSearch, setShopSearch] = useState('');

  // Cart for ordering
  const [cart, setCart] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const [dynamicCategories, setDynamicCategories] = useState([]);

  // Photo Zoom Lightbox state
  const [zoomPhoto, setZoomPhoto] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && zoomPhoto) {
        setZoomPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomPhoto]);
  const [billType, setBillType] = useState('NON_GST');
  const [orderChannel, setOrderChannel] = useState('IN_PERSON_BEAT'); // 'IN_PERSON_BEAT' or 'PHONE_ORDER'
  const [orderNotes, setOrderNotes] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payBillType, setPayBillType] = useState('NON_GST');
  const [collectionChannel, setCollectionChannel] = useState('IN_PERSON_BEAT'); // 'IN_PERSON_BEAT' or 'PHONE_COLLECTION'
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

  const categories = [
    'ALL',
    'Brass C.P. Fittings',
    'Pipes & Fittings',
    'Valves & Diverters',
    'Sanitaryware',
    'Bath Accessories',
  ];

  const showSimToast = (msg, type = 'success') => {
    setSimAlert({ msg, type });
    setTimeout(() => setSimAlert(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const lat = simulatedProximity === 'NEAR' ? 22.8123 : 22.845;
      const lng = simulatedProximity === 'NEAR' ? 70.8354 : 70.89;

      const [sRes, pRes, rRes, cRes] = await Promise.all([
        shopsAPI.getAll({ salesmanLat: lat, salesmanLng: lng }),
        productsAPI.getAll(),
        routesAPI.getAll(),
        categoriesAPI.getAll().catch(() => ({ data: { categories: [] } })),
      ]);

      if (cRes.data?.success) {
        setDynamicCategories(['ALL', ...cRes.data.categories.map((c) => c.name)]);
      }

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
      await visitsAPI.getAll();
      if (simulatedProximity === 'NEAR') {
        showSimToast(`📍 GPS Verified (28m from ${shop.shopName})! Visit recorded.`, 'success');
      } else {
        showSimToast(`⚠️ Warning: 1.4km away from ${shop.shopName}! Flagged for review.`, 'warning');
      }
    } catch (e) {
      showSimToast('Check-in logged', 'success');
    }
  };

  // Cart helpers (Blinkit / Flipkart style with Size Variants)
  const handleUpdateCart = (p, variant, delta, boxMultiplier = 1) => {
    const varName = variant ? variant.size : '';
    const itemKey = varName ? `${p._id}___${varName}` : p._id;
    const itemPrice = variant ? variant.basePrice : p.basePrice || 0;
    const itemBoxQty = variant ? variant.boxQuantity : p.boxQuantity || 1;
    const itemSku = variant ? variant.sku : p.sku || '';

    setCart((prev) => {
      const cur = prev[itemKey]?.quantity || 0;
      const next = Math.max(0, cur + delta * boxMultiplier);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemKey];
        return copy;
      }
      return {
        ...prev,
        [itemKey]: {
          productId: p._id,
          productName: p.name,
          variantName: varName,
          sku: itemSku,
          price: itemPrice,
          boxQuantity: itemBoxQty,
          gstPercentage: p.gstPercentage || 18,
          quantity: next,
        },
      };
    });
  };

  // Calculate order totals
  let subtotal = 0;
  let gstAmount = 0;
  let totalBoxes = 0;

  Object.values(cart).forEach((item) => {
    const line = (item.price || 0) * (item.quantity || 0);
    subtotal += line;
    totalBoxes += Math.ceil(item.quantity / (item.boxQuantity || 1));
    if (billType === 'GST') {
      gstAmount += Math.round((line * (item.gstPercentage || 18)) / 100);
    }
  });
  const totalAmount = subtotal + gstAmount;

  // Submit order
  const handlePunchOrder = async () => {
    if (Object.keys(cart).length === 0) {
      showSimToast('Select at least 1 product from catalog', 'error');
      return;
    }

    const items = Object.entries(cart).map(([productId, quantity]) => {
      const p = products.find((prod) => prod._id === productId);
      return {
        productId,
        quantity,
        boxCount: Math.floor(quantity / (p.boxQuantity || 1)) || 1,
        customPrice: p.basePrice,
      };
    });

    const isRemote = orderChannel === 'PHONE_ORDER';

    try {
      const res = await ordersAPI.create({
        shopId: selectedShop._id,
        billType,
        items,
        orderChannel,
        isWithoutVisit: isRemote,
        dispatchNotes: orderNotes || (isRemote ? '📞 Phone Order received from retailer (Without Visit)' : 'In-person beat order'),
      });

      if (res.data.success) {
        showSimToast(`🚀 ${isRemote ? 'Phone Order' : 'Order'} ${res.data.order.orderNumber} sent to Warehouse!`, 'success');
        
        setWhatsAppData({
          type: 'ORDER',
          shop: selectedShop,
          orderNumber: res.data.order.orderNumber,
          billType,
          totalAmount,
          itemCount: Object.keys(cart).length,
          totalBoxes,
          orderChannel,
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

    const isRemote = collectionChannel === 'PHONE_COLLECTION';

    try {
      const res = await paymentsAPI.record({
        shopId: selectedShop._id,
        billType: payBillType,
        amount: amt,
        mode: payMode,
        collectionChannel,
        isWithoutVisit: isRemote,
        chequeNumber: payMode === 'CHEQUE' ? chequeNo : undefined,
        chequeBank: payMode === 'CHEQUE' ? chequeBank : undefined,
        notes: isRemote ? '📞 Phone / Remote payment received' : 'In-person collection',
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
          collectionChannel,
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
    showSimToast(`📍 GPS Re-Pinned to coordinates: ${lat}, ${lng}`, 'success');
  };

  // Generate WhatsApp Share Link
  const getWhatsAppShareUrl = () => {
    if (!whatsAppData) return '';
    let msg = '';
    const phone = whatsAppData.shop?.phone || '919898011111';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const recipient = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    if (whatsAppData.type === 'ORDER') {
      const isPhone = whatsAppData.orderChannel === 'PHONE_ORDER';
      msg = `*SHIVAM MARKETING - ORDER CONFIRMATION*\n------------------------------\n🏪 *Shop:* ${whatsAppData.shop?.shopName}\n📄 *Order No:* ${whatsAppData.orderNumber}\n📑 *Bill Type:* ${whatsAppData.billType === 'GST' ? 'GST Invoice (+18%)' : 'Without GST (Rough Cash)'}\n📞 *Channel:* ${isPhone ? 'Phone Call Order (Without Visit)' : 'In-Person Beat Visit'}\n📦 *Items:* ${whatsAppData.itemCount} Items (${whatsAppData.totalBoxes || 1} Boxes)\n💰 *Total Amount:* ₹${whatsAppData.totalAmount.toLocaleString()}\n🚚 *Status:* PUNCHED TO WAREHOUSE\n------------------------------\nThank you for your business!`;
    } else {
      const isRemote = whatsAppData.collectionChannel === 'PHONE_COLLECTION';
      msg = `*SHIVAM MARKETING - PAYMENT RECEIPT*\n------------------------------\n🏪 *Shop:* ${whatsAppData.shop?.shopName}\n🧾 *Receipt No:* ${whatsAppData.receiptNumber}\n📑 *Book:* ${whatsAppData.billType === 'GST' ? 'GST Official Ledger' : 'Rough Cash Ledger'}\n📞 *Type:* ${isRemote ? 'Remote Payment (Online/UPI)' : 'In-Person Cash Collection'}\n💵 *Amount Received:* ₹${whatsAppData.amount.toLocaleString()}\n💳 *Mode:* ${whatsAppData.mode}\n✅ *Status:* RECEIVED & CREDITED\n------------------------------\nThank you for the prompt payment!`;
    }

    return `https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`;
  };

  const filteredCatalogProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.brand?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(catalogSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

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
            Blinkit/Flipkart-style visual photo catalog, box packaging steppers, GPS proximity check-in, and 1-tap WhatsApp digital billing.
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
          {/* Top Dynamic Island */}
          <div className="w-28 h-5 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center gap-2 border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
            <div className="w-8 h-1.5 rounded-full bg-slate-800" />
          </div>

          {/* Phone Display Screen */}
          <div className="bg-slate-950 rounded-[34px] overflow-hidden border border-slate-800/80 min-h-[670px] max-h-[730px] flex flex-col relative text-slate-100 font-sans">
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
                    {deviceRole === 'SALESMAN' ? 'SHIVAM FIELD SALES' : 'B2B WHOLESALE STORE'}
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
                className={`absolute top-14 left-3 right-3 z-50 p-2.5 rounded-xl text-xs font-bold shadow-xl border animate-bounce ${
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
                          {/* Multi-Beat Selector */}
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
                              <span className="text-emerald-400 font-bold">Collected: ₹35,000</span>
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
                                        setOrderChannel('IN_PERSON_BEAT');
                                        setCollectionChannel('IN_PERSON_BEAT');
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

                    {/* TAB 2: PHONE CALL ORDER / SEARCH ALL SHOPS */}
                    {salesmanTab === 'PHONE_SEARCH' && (
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/70 to-slate-900 border border-purple-800/40 space-y-1">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="w-4 h-4 text-purple-400" />
                            <span className="font-bold text-white text-xs">Phone Call Order Desk</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Search any assigned shop to punch orders or record remote payments without physically visiting the shop.
                          </p>
                        </div>

                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search shop, owner, mobile, or city..."
                            value={shopSearch}
                            onChange={(e) => setShopSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-2">
                          {shops
                            .filter((s) =>
                              s.shopName?.toLowerCase().includes(shopSearch.toLowerCase()) ||
                              s.ownerName?.toLowerCase().includes(shopSearch.toLowerCase()) ||
                              s.phone?.includes(shopSearch) ||
                              s.city?.toLowerCase().includes(shopSearch.toLowerCase())
                            )
                            .map((shop) => (
                              <div key={shop._id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-bold text-white">{shop.shopName}</div>
                                    <div className="text-[10px] text-slate-400">{shop.ownerName} • {shop.phone} • {shop.city}</div>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                    Off-Beat
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    onClick={() => {
                                      setSelectedShop(shop);
                                      setOrderChannel('PHONE_ORDER');
                                      setCart({});
                                      setScreen('TAKE_ORDER');
                                    }}
                                    className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center gap-1"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                    <span>Punch Phone Order</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedShop(shop);
                                      setCollectionChannel('PHONE_COLLECTION');
                                      setPayAmount('');
                                      setScreen('COLLECT_PAYMENT');
                                    }}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] flex items-center justify-center gap-1"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Remote Payment</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: VISUAL PHOTO CATALOG (Blinkit / Flipkart Style) */}
                    {salesmanTab === 'CATALOG' && (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Search & Category Filter Pills */}
                        <div className="p-3 space-y-2 bg-slate-900 border-b border-slate-800">
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Search Astral, Jaquar, CPVC, bib cock..."
                              value={catalogSearch}
                              onChange={(e) => setCatalogSearch(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {categories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${
                                  selectedCategory === cat
                                    ? 'bg-sky-600 text-white shadow'
                                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Product Photo Grid (2-Columns Flipkart / Blinkit Style) */}
                        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2.5">
                          {filteredCatalogProducts.map((p) => {
                            const hasVars = Boolean(p.hasVariants && p.variants?.length > 0);
                            const currentVarIdx = selectedVariants[p._id] ?? 0;
                            const activeVar = hasVars ? p.variants[currentVarIdx] || p.variants[0] : null;

                            const activePrice = activeVar ? activeVar.basePrice : p.basePrice || 0;
                            const activeBoxQty = activeVar ? activeVar.boxQuantity : p.boxQuantity || 1;
                            const isOutOfStock = activeVar ? activeVar.isOutOfStock : p.isOutOfStock;

                            const itemKey = activeVar ? `${p._id}___${activeVar.size}` : p._id;
                            const qty = cart[itemKey]?.quantity || 0;

                            return (
                              <div
                                key={p._id}
                                className={`bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col justify-between hover:border-slate-700 transition-all ${
                                  isOutOfStock ? 'opacity-60' : ''
                                }`}
                              >
                                <div>
                                  {/* Product Image */}
                                  <div
                                    onClick={() =>
                                      p.imageUrl &&
                                      setZoomPhoto({
                                        url: p.imageUrl,
                                        name: p.name,
                                        brand: p.brand,
                                        price: p.basePrice,
                                      })
                                    }
                                    className={`relative w-full aspect-square bg-slate-950 rounded-xl overflow-hidden mb-2 border border-slate-800 flex items-center justify-center ${
                                      p.imageUrl ? 'cursor-zoom-in group/img hover:border-sky-500/60 transition-colors' : ''
                                    }`}
                                    title={p.imageUrl ? 'Click to view photo larger' : undefined}
                                  >
                                    {p.imageUrl ? (
                                      <img
                                        src={p.imageUrl}
                                        alt={p.name}
                                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23334155" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                                        }}
                                      />
                                    ) : (
                                      <ImageIcon className="w-8 h-8 text-slate-700" />
                                    )}

                                    {/* Brand Pill */}
                                    <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-950/80 text-sky-400 border border-slate-800">
                                      {p.brand}
                                    </span>

                                    {isOutOfStock && (
                                      <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-rose-300">
                                        OUT OF STOCK
                                      </span>
                                    )}
                                  </div>

                                  {/* Name & Packaging */}
                                  <div className="font-bold text-white text-[11px] line-clamp-2 leading-tight mb-1">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Box: <b className="text-slate-200">{activeBoxQty} {p.uom || 'Pcs'}</b>
                                  </div>

                                  {/* Size Variant Chips (Flipkart Style) */}
                                  {hasVars && (
                                    <div className="mt-2 pt-1.5 border-t border-slate-800">
                                      <span className="text-[9px] text-sky-400 font-bold uppercase tracking-wider block mb-1">
                                        Size / Spec:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {p.variants.map((v, vIdx) => {
                                          const isSelected = currentVarIdx === vIdx;
                                          return (
                                            <button
                                              key={v.size || vIdx}
                                              onClick={() => setSelectedVariants((prev) => ({ ...prev, [p._id]: vIdx }))}
                                              className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                                                isSelected
                                                  ? 'bg-sky-600 border-sky-400 text-white shadow'
                                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                              }`}
                                            >
                                              {v.size} (₹{v.basePrice})
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Price & Add / Stepper */}
                                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                                  <div className="flex items-baseline justify-between">
                                    <span className="font-extrabold text-white text-xs">₹{activePrice}</span>
                                    <span className="text-[9px] text-slate-500">
                                      ₹{(activePrice * activeBoxQty).toLocaleString()} / box
                                    </span>
                                  </div>

                                  {!isOutOfStock ? (
                                    qty === 0 ? (
                                      <button
                                        onClick={() => handleUpdateCart(p, activeVar, 1, activeBoxQty)}
                                        className="w-full py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold flex items-center justify-center gap-1 active:scale-95"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>+ ADD BOX</span>
                                      </button>
                                    ) : (
                                      <div className="flex items-center justify-between bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-1">
                                        <button
                                          onClick={() => handleUpdateCart(p, activeVar, -1, 1)}
                                          className="w-6 h-6 rounded-lg bg-emerald-900/60 text-emerald-200 font-bold flex items-center justify-center active:scale-90"
                                        >
                                          -
                                        </button>
                                        <span className="text-xs font-extrabold text-emerald-300">
                                          {qty}
                                        </span>
                                        <button
                                          onClick={() => handleUpdateCart(p, activeVar, 1, 1)}
                                          className="w-6 h-6 rounded-lg bg-emerald-900/60 text-emerald-200 font-bold flex items-center justify-center active:scale-90"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    <span className="text-[9px] text-center text-rose-400 font-semibold">Unavailable</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Blinkit-Style Sticky Floating Bottom Cart Bar */}
                        {Object.keys(cart).length > 0 && (
                          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-t border-emerald-500/40 p-2.5 flex items-center justify-between shadow-2xl animate-fade-in">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                                <ShoppingCart className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">
                                  {Object.keys(cart).length} Items ({totalBoxes} Boxes)
                                </span>
                                <span className="text-sm font-extrabold text-emerald-400">
                                  ₹{totalAmount.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setScreen('TAKE_ORDER');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/40 active:scale-95 flex items-center gap-1"
                            >
                              <span>Review & Punch</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: COLLECTIONS SUMMARY */}
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
                              <div className="text-[10px] text-slate-400">RCP-2026-0001 • Cash (Beat Visit)</div>
                            </div>
                            <span className="font-extrabold text-emerald-400">₹20,000</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white">Shreeji Traders</div>
                              <div className="text-[10px] text-purple-300 font-semibold">RCP-2026-0002 • UPI 📞 (Remote No Visit)</div>
                            </div>
                            <span className="font-extrabold text-emerald-400">₹15,000</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 5: KPIS & TARGETS */}
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
                            <span className="text-slate-400 text-[10px] block">Phone Orders Taken</span>
                            <span className="font-bold text-purple-400 text-base mt-1 block">2 Remote</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 text-[10px] block">New Shops Onboarded</span>
                            <span className="font-bold text-white text-base mt-1 block">3 this week</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Salesman Bottom Navigation Bar */}
                    <div className="bg-slate-900 border-t border-slate-800 px-1 py-2 flex items-center justify-around text-[9px]">
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
                          salesmanTab === 'CATALOG' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Catalog</span>
                      </button>
                      <button
                        onClick={() => setSalesmanTab('PHONE_SEARCH')}
                        className={`flex flex-col items-center gap-1 ${
                          salesmanTab === 'PHONE_SEARCH' ? 'text-purple-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Phone Order</span>
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
                        <span>KPIs</span>
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
                          setOrderChannel('IN_PERSON_BEAT');
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
                          setCollectionChannel('IN_PERSON_BEAT');
                          setScreen('COLLECT_PAYMENT');
                        }}
                        className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Collect Payment</span>
                      </button>
                    </div>

                    {/* Quick Call & Phone Order Action Bar */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setCart({});
                          setOrderChannel('PHONE_ORDER');
                          setScreen('TAKE_ORDER');
                        }}
                        className="py-2.5 rounded-xl bg-purple-950/60 border border-purple-800/50 hover:border-purple-500 text-purple-300 text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-purple-400" />
                        <span>📞 Phone Order (No Visit)</span>
                      </button>
                      <button
                        onClick={() => {
                          setPayAmount('');
                          setCollectionChannel('PHONE_COLLECTION');
                          setScreen('COLLECT_PAYMENT');
                        }}
                        className="py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 hover:border-emerald-600 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Remote Payment</span>
                      </button>
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
                      {/* Channel Switcher */}
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Order Channel:</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setOrderChannel('IN_PERSON_BEAT')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              orderChannel === 'IN_PERSON_BEAT'
                                ? 'bg-sky-600 border-sky-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            📍 Beat Visit
                          </button>
                          <button
                            onClick={() => setOrderChannel('PHONE_ORDER')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              orderChannel === 'PHONE_ORDER'
                                ? 'bg-purple-600 border-purple-500 text-white shadow'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            📞 Phone (No Visit)
                          </button>
                        </div>
                      </div>

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

                      {/* Product Catalog Items with Photos */}
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {products.map((prod) => {
                          const qty = cart[prod._id] || 0;
                          const isOutOfStock = prod.isOutOfStock;

                          return (
                            <div
                              key={prod._id}
                              className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2.5 ${
                                isOutOfStock ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {prod.imageUrl ? (
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    onClick={() =>
                                      setZoomPhoto({
                                        url: prod.imageUrl,
                                        name: prod.name,
                                        brand: prod.brand,
                                        price: prod.basePrice,
                                      })
                                    }
                                    className="w-11 h-11 rounded-lg object-cover border border-slate-800 shrink-0 cursor-zoom-in hover:scale-105 hover:border-sky-500 transition-all"
                                    title="Click to view photo larger"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23334155" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                                    }}
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-4 h-4 text-slate-700" />
                                  </div>
                                )}
                                <div className="truncate">
                                  <div className="font-bold text-white text-xs truncate">{prod.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {prod.brand} • Box: {prod.boxQuantity} {prod.uom}
                                  </div>
                                  <div className="text-[11px] font-extrabold text-emerald-400">
                                    ₹{prod.basePrice} <span className="text-[9px] text-slate-500 font-normal">({billType === 'GST' ? '+18%' : 'Net'})</span>
                                  </div>
                                </div>
                              </div>

                              {!isOutOfStock ? (
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <div className="flex items-center gap-1.5 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800">
                                    <button
                                      onClick={() => handleUpdateCart(prod._id, -1, 1)}
                                      className="text-slate-400 hover:text-white font-bold px-1"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-emerald-400 text-xs min-w-[20px] text-center">
                                      {qty}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateCart(prod._id, 1, 1)}
                                      className="text-slate-400 hover:text-white font-bold px-1"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleUpdateCart(prod._id, 1, prod.boxQuantity || 1)}
                                    className="text-[9px] font-bold text-sky-400 hover:underline"
                                  >
                                    +1 Box ({prod.boxQuantity})
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-bold block shrink-0">
                                  Out of Stock
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
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 active:scale-95 flex items-center gap-1.5"
                      >
                        {orderChannel === 'PHONE_ORDER' && <PhoneCall className="w-3.5 h-3.5" />}
                        <span>Punch {orderChannel === 'PHONE_ORDER' ? 'Phone Order' : 'Order'} &rarr;</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. SALESMAN COLLECT PAYMENT SCREEN */}
                {screen === 'COLLECT_PAYMENT' && selectedShop && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">Collection:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCollectionChannel('IN_PERSON_BEAT')}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            collectionChannel === 'IN_PERSON_BEAT'
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          📍 Beat Cash
                        </button>
                        <button
                          onClick={() => setCollectionChannel('PHONE_COLLECTION')}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            collectionChannel === 'PHONE_COLLECTION'
                              ? 'bg-purple-600 border-purple-500 text-white shadow'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          📞 Remote Payment
                        </button>
                      </div>
                    </div>

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
                      Record {collectionChannel === 'PHONE_COLLECTION' ? 'Remote' : ''} Payment & Generate Receipt &rarr;
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
                            <div><b>Channel:</b> {whatsAppData.orderChannel === 'PHONE_ORDER' ? '📞 Phone Order (No Visit)' : '📍 Beat Visit'}</div>
                            <div><b>Boxes:</b> {whatsAppData.totalBoxes || 1} Master Boxes</div>
                            <div><b>Amount:</b> ₹{whatsAppData.totalAmount.toLocaleString()}</div>
                          </>
                        ) : (
                          <>
                            <div><b>Receipt No:</b> {whatsAppData.receiptNumber}</div>
                            <div><b>Type:</b> {whatsAppData.collectionChannel === 'PHONE_COLLECTION' ? '📞 Remote (No Visit)' : '📍 In-Person Cash'}</div>
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

            {/* SCREEN: SHOP OWNER MODE (Blinkit / Flipkart Style Retail Portal) */}
            {deviceRole === 'SHOP_OWNER' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 1. SHOP OWNER DASHBOARD */}
                {shopOwnerTab === 'DASHBOARD' && (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white">Shri Krishna Hardware</span>
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                          Verified Shop
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Proprietor: Jayeshbhai Shah • Morbi</p>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Credit Limit: <b className="text-slate-200">₹1,50,000</b></span>
                          <span className="text-emerald-400 font-bold">₹80,500 Available</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full rounded-full w-[46%]" />
                        </div>
                      </div>

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

                    {/* Delivery Tracker */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-sky-400" />
                          <span>Active Delivery Tracking</span>
                        </span>
                        <span className="text-[10px] font-mono text-sky-400 font-bold">ORD-2026-0001</span>
                      </div>

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

                    {/* Quick Restock Banner */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/70 to-slate-900 border border-indigo-800/40 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Browse Visual Wholesale Catalog</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Order Astral, Jaquar & Cera bathware directly</div>
                      </div>
                      <button
                        onClick={() => setShopOwnerTab('CATALOG')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow"
                      >
                        Shop Now &rarr;
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
                  </div>
                )}

                {/* 3. SHOP OWNER BLINKIT/FLIPKART STYLE WHOLESALE CATALOG */}
                {shopOwnerTab === 'CATALOG' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-3 space-y-2 bg-slate-900 border-b border-slate-800">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search Jaquar, CPVC, basin..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${
                              selectedCategory === cat
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2.5">
                      {filteredCatalogProducts.map((p) => {
                        const qty = cart[p._id] || 0;
                        const isOutOfStock = p.isOutOfStock;

                        return (
                          <div
                            key={p._id}
                            className={`bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col justify-between hover:border-slate-700 transition-all ${
                              isOutOfStock ? 'opacity-60' : ''
                            }`}
                          >
                            <div>
                              <div
                                onClick={() =>
                                  p.imageUrl &&
                                  setZoomPhoto({
                                    url: p.imageUrl,
                                    name: p.name,
                                    brand: p.brand,
                                    price: p.basePrice,
                                  })
                                }
                                className={`relative w-full aspect-square bg-slate-950 rounded-xl overflow-hidden mb-2 border border-slate-800 flex items-center justify-center ${
                                  p.imageUrl ? 'cursor-zoom-in group/img hover:border-indigo-500/60 transition-colors' : ''
                                }`}
                                title={p.imageUrl ? 'Click to view photo larger' : undefined}
                              >
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src =
                                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23334155" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                                    }}
                                  />
                                ) : (
                                  <ImageIcon className="w-8 h-8 text-slate-700" />
                                )}

                                <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-950/80 text-indigo-400 border border-slate-800">
                                  {p.brand}
                                </span>
                              </div>

                              <div className="font-bold text-white text-[11px] line-clamp-2 leading-tight mb-1">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Box: <b className="text-slate-200">{p.boxQuantity} {p.uom}</b>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                              <div className="flex items-baseline justify-between">
                                <span className="font-extrabold text-white text-xs">₹{p.basePrice}</span>
                                <span className="text-[9px] text-slate-500">
                                  ₹{(p.basePrice * (p.boxQuantity || 1)).toLocaleString()} / box
                                </span>
                              </div>

                              {!isOutOfStock ? (
                                qty === 0 ? (
                                  <button
                                    onClick={() => handleUpdateCart(p._id, 1, p.boxQuantity || 1)}
                                    className="w-full py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-extrabold flex items-center justify-center gap-1 active:scale-95"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>+ RESTOCK BOX</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between bg-indigo-950/80 border border-indigo-500/50 rounded-xl p-1">
                                    <button
                                      onClick={() => handleUpdateCart(p._id, -1, 1)}
                                      className="w-6 h-6 rounded-lg bg-indigo-900/60 text-indigo-200 font-bold flex items-center justify-center active:scale-90"
                                    >
                                      -
                                    </button>
                                    <span className="text-xs font-extrabold text-indigo-300">
                                      {qty}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateCart(p._id, 1, 1)}
                                      className="w-6 h-6 rounded-lg bg-indigo-900/60 text-indigo-200 font-bold flex items-center justify-center active:scale-90"
                                    >
                                      +
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-[9px] text-center text-rose-400 font-semibold">Out of Stock</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Shop Owner Floating Order Button */}
                    {Object.keys(cart).length > 0 && (
                      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-t border-indigo-500/40 p-2.5 flex items-center justify-between shadow-2xl animate-fade-in">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {Object.keys(cart).length} Products ({totalBoxes} Boxes)
                          </span>
                          <span className="text-sm font-extrabold text-indigo-400">
                            ₹{totalAmount.toLocaleString()}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            showSimToast('🚀 Restock Order sent directly to Shivam Warehouse Desk!', 'success');
                            setCart({});
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-900/40 active:scale-95 flex items-center gap-1"
                        >
                          <span>Place Restock Order</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SHOP OWNER DUAL LEDGER */}
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
                    onClick={() => setShopOwnerTab('CATALOG')}
                    className={`flex flex-col items-center gap-1 ${
                      shopOwnerTab === 'CATALOG' ? 'text-indigo-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Store Catalog</span>
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Photo Zoom Lightbox Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="relative max-w-xl w-full bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-white text-base truncate">{zoomPhoto.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  {zoomPhoto.brand && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 font-bold text-[10px]">
                      {zoomPhoto.brand}
                    </span>
                  )}
                  {zoomPhoto.price ? (
                    <span className="font-bold text-emerald-400">• ₹{zoomPhoto.price}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-Resolution Image Box */}
            <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[65vh]">
              <img
                src={zoomPhoto.url}
                alt={zoomPhoto.name}
                className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                }}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span>Click outside or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> to close</span>
              <a
                href={zoomPhoto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full size
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
