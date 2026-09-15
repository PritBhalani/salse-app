import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { mobileAPI } from '../config/api';
import { ImageZoomModal } from '../components/ImageZoomModal';
import {
  saveLocalCatalog,
  getLocalCatalog,
  saveLocalShops,
  getLocalShops,
  getPendingOutboxCount,
  syncOutboxToServer,
} from '../utils/offlineSync';

// =========================================================================
// MEMOIZED HIGH-PERFORMANCE 2-COLUMN PRODUCT CATALOG CARD
// =========================================================================
const GridProductCard = React.memo(
  ({
    product,
    selectedVarIdx,
    onSelectVariant,
    qtyInCart,
    onUpdateCart,
    onSetDirectQuantity,
    onZoomPhoto,
  }) => {
    const hasVars = Boolean(product.hasVariants && product.variants?.length > 0);
    const currentVarIdx = selectedVarIdx ?? 0;
    const activeVar = hasVars ? product.variants[currentVarIdx] || product.variants[0] : null;

    const activePrice = activeVar ? activeVar.basePrice : product.basePrice || 0;
    const activeBoxQty = activeVar ? activeVar.boxQuantity : product.boxQuantity || 1;
    const isOutOfStock = activeVar ? activeVar.isOutOfStock : product.isOutOfStock;

    const inputRef = useRef(null);

    return (
      <View style={[styles.gridCard, isOutOfStock && styles.gridCardDisabled]}>
        {/* Photo Container with Brand Badge & Tap-to-Zoom */}
        <TouchableOpacity
          style={styles.gridImageContainer}
          activeOpacity={product.imageUrl ? 0.75 : 1}
          onPress={() => {
            if (product.imageUrl) {
              onZoomPhoto({
                url: product.imageUrl,
                name: product.name,
                brand: product.brand,
                price: activePrice,
              });
            }
          }}
        >
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>🚿</Text>
            </View>
          )}
          {product.brand ? (
            <View style={styles.gridBrandBadge}>
              <Text style={styles.gridBrandBadgeText} numberOfLines={1}>
                {product.brand}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Title & Category */}
        <Text style={styles.gridProdName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.gridProdCategory} numberOfLines={1}>
          {product.category || 'Hardware'}
        </Text>

        {/* Flipkart-Style Size Variant Chips */}
        {hasVars && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gridVariantScroll}
            contentContainerStyle={{ paddingRight: 4 }}
          >
            {product.variants.map((v, vIdx) => {
              const isSelected = currentVarIdx === vIdx;
              return (
                <TouchableOpacity
                  key={v.size || vIdx}
                  style={[styles.gridVarChip, isSelected && styles.gridVarChipActive]}
                  onPress={() => onSelectVariant(product._id, vIdx)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.gridVarChipText,
                      isSelected && styles.gridVarChipTextActive,
                    ]}
                  >
                    {v.size}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Packaging Box Info & Price */}
        <View style={styles.gridBoxTag}>
          <Text style={styles.gridBoxTagText} numberOfLines={1}>
            📦 Box: {activeBoxQty} pcs • ₹{((activePrice || 0) * activeBoxQty).toLocaleString()}
          </Text>
        </View>

        <View style={styles.gridPriceRow}>
          <Text style={styles.gridPrice}>₹{activePrice?.toLocaleString()}</Text>
          <Text style={styles.gridPriceUnit}> / {product.uom || 'pc'}</Text>
        </View>

        {/* Out of Stock Banner OR Add to Cart Stepper */}
        {isOutOfStock ? (
          <View style={styles.gridOutOfStockBanner}>
            <Text style={styles.gridOutOfStockText}>Out of Stock</Text>
          </View>
        ) : (
          <View style={styles.gridActionContainer}>
            <TouchableOpacity
              style={styles.gridBoxBtn}
              onPress={() => onUpdateCart(product, activeVar, 1, activeBoxQty)}
              activeOpacity={0.75}
            >
              <Text style={styles.gridBoxBtnText}>+1 Box ({activeBoxQty} pcs)</Text>
            </TouchableOpacity>

            <View style={styles.gridStepper}>
              <TouchableOpacity
                style={styles.gridStepperBtn}
                onPress={() => onUpdateCart(product, activeVar, -1, 1)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.gridStepperBtnText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gridStepperInputContainer}
                onPress={() => inputRef.current && inputRef.current.focus()}
                activeOpacity={0.7}
              >
                <TextInput
                  ref={inputRef}
                  style={styles.gridStepperInput}
                  keyboardType="number-pad"
                  value={qtyInCart > 0 ? String(qtyInCart) : ''}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  onChangeText={(text) => {
                    const clean = text.replace(/[^0-9]/g, '');
                    const val = clean === '' ? 0 : parseInt(clean, 10);
                    onSetDirectQuantity(product, activeVar, Math.min(99999, val));
                  }}
                  selectTextOnFocus
                  maxLength={5}
                />
                <Text style={styles.gridStepperUnitText}>pcs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gridStepperBtn}
                onPress={() => onUpdateCart(product, activeVar, 1, 1)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.gridStepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.product._id === next.product._id &&
      prev.product.basePrice === next.product.basePrice &&
      prev.product.isOutOfStock === next.product.isOutOfStock &&
      prev.product.imageUrl === next.product.imageUrl &&
      prev.selectedVarIdx === next.selectedVarIdx &&
      prev.qtyInCart === next.qtyInCart
    );
  }
);

// =========================================================================
// MEMOIZED BEAT SHOP CARD
// =========================================================================
const ShopCard = React.memo(
  ({
    shop,
    isAssignedToMe,
    onCheckIn,
    checkInLoading,
    onSelectShop,
    onCall,
    onWhatsApp,
    onOpenMap,
  }) => {
    const distance = shop.distanceMeters !== undefined ? shop.distanceMeters : 45;
    const isInsideGeofence = distance <= 250;
    const totalDue = (shop.gstBalance || 0) + (shop.nonGstBalance || 0);

    return (
      <View style={styles.shopCard}>
        {/* Header with Shop Name, Assignment Badge and City Pill */}
        <View style={styles.shopCardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.shopName} numberOfLines={1}>
                {shop.shopName}
              </Text>
              {isAssignedToMe && (
                <View style={styles.myShopBadge}>
                  <Text style={styles.myShopBadgeText}>⭐ My Shop</Text>
                </View>
              )}
            </View>
            <Text style={styles.ownerText} numberOfLines={1}>
              {shop.ownerName || 'Proprietor'} • {shop.city || 'Morbi'}
            </Text>
          </View>
          <View style={styles.cityPill}>
            <Text style={styles.cityPillText}>{shop.city || 'Morbi'}</Text>
          </View>
        </View>

        {/* GPS Proximity & Map Navigation Row */}
        <View style={styles.proximityRow}>
          <View style={styles.proximityGroup}>
            <View
              style={[
                styles.proximityDot,
                isInsideGeofence ? styles.dotInside : styles.dotOutside,
              ]}
            />
            <Text
              style={[
                styles.proximityDistanceText,
                isInsideGeofence ? styles.textInside : styles.textOutside,
              ]}
            >
              {distance > 1000 ? `${(distance / 1000).toFixed(1)} km away` : `${distance}m away`}
            </Text>
            <Text style={styles.proximityStatusText}>
              ({isInsideGeofence ? 'At Shop' : 'Off-Site'})
            </Text>
          </View>

          <TouchableOpacity
            style={styles.directionLinkBtn}
            onPress={() => onOpenMap(shop)}
            activeOpacity={0.7}
          >
            <Text style={styles.directionLinkText}>🗺️ Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Dual Ledger Balance (GST / Non-GST / Total) */}
        <View style={styles.balanceGrid}>
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>GST Due</Text>
            <Text style={styles.balanceValGst}>
              ₹{(shop.gstBalance || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceColDivider} />
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>Rough Due</Text>
            <Text style={styles.balanceValRough}>
              ₹{(shop.nonGstBalance || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceColDivider} />
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>Total Due</Text>
            <Text style={styles.balanceValTotal}>₹{totalDue.toLocaleString()}</Text>
          </View>
        </View>

        {/* Action Buttons: GPS Check-In & Open Shop */}
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={styles.checkInBtn}
            onPress={() => onCheckIn(shop)}
            disabled={checkInLoading === shop._id}
            activeOpacity={0.75}
          >
            {checkInLoading === shop._id ? (
              <ActivityIndicator color="#34d399" size="small" />
            ) : (
              <Text style={styles.checkInBtnText}>📍 GPS Check-In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.visitShopBtn}
            onPress={() => onSelectShop(shop)}
            activeOpacity={0.75}
          >
            <Text style={styles.visitShopBtnText}>Visit Shop &rarr;</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Contact Icons Row */}
        <View style={styles.quickContactRow}>
          <TouchableOpacity
            style={styles.quickContactBtn}
            onPress={() => onCall(shop.phone)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickContactText}>📞 Call Owner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickContactBtn}
            onPress={() => onWhatsApp(shop)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickContactText}>📲 WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

// =========================================================================
// MAIN SCREEN COMPONENT
// =========================================================================
export const TodayBeatScreen = ({
  user,
  onSelectShop,
  onPunchOrder,
  onCollectPayment,
  onOpenRegisterShop,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState('BEAT'); // 'BEAT', 'CATALOG', 'PHONE_SEARCH', 'COLLECTIONS', 'KPIS'
  const [allRoutes, setAllRoutes] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [shopScopeFilter, setShopScopeFilter] = useState('ALL'); // 'ALL' or 'MY_SHOPS'
  const [fetchError, setFetchError] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const [cart, setCart] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});

  const [outboxCount, setOutboxCount] = useState(0);
  const [syncingOutbox, setSyncingOutbox] = useState(false);

  const currentSalesmanCoords = {
    latitude: 22.8125,
    longitude: 70.8355,
  };

  const fetchAllData = async () => {
    setLoading(true);
    setFetchError(null);

    // 1. Fetch Route
    try {
      const routeRes = await mobileAPI.get('/routes/my-route');
      if (routeRes.data?.success) {
        setAllRoutes(routeRes.data.routes || []);
        setRouteData(routeRes.data.route);
        if (routeRes.data.route && !selectedRouteId) {
          setSelectedRouteId(routeRes.data.route._id);
        }
      }
    } catch (e) {
      console.warn('Could not fetch routes:', e.message);
    }

    // 2. Fetch Shops (with offline cache fallback)
    try {
      const shopRes = await mobileAPI.get(
        `/shops?salesmanLat=${currentSalesmanCoords.latitude}&salesmanLng=${currentSalesmanCoords.longitude}`
      );
      if (shopRes.data?.success) {
        setShops(shopRes.data.shops || []);
        await saveLocalShops(shopRes.data.shops || [], allRoutes);
      }
    } catch (e) {
      console.warn('Network offline, loading cached shops:', e.message);
      const cached = await getLocalShops();
      if (cached.shops?.length > 0) {
        setShops(cached.shops);
        if (cached.routes?.length > 0) setAllRoutes(cached.routes);
      } else {
        setFetchError(e.message || 'Offline mode: No cached shops found');
      }
    }

    // 3. Fetch Products Catalog (with offline cache fallback)
    try {
      const prodRes = await mobileAPI.get('/products');
      if (prodRes.data?.success) {
        setProducts(prodRes.data.products || []);
        await saveLocalCatalog(prodRes.data.products || []);
      }
    } catch (e) {
      console.warn('Network offline, loading cached catalog:', e.message);
      const cached = await getLocalCatalog();
      if (cached?.length > 0) {
        setProducts(cached);
      }
    }

    // 4. Fetch Payments
    try {
      const payRes = await mobileAPI.get('/payments');
      if (payRes.data?.success) {
        setPayments(payRes.data.payments || []);
      }
    } catch (e) {
      console.warn('Could not fetch payments:', e.message);
    }

    // Check pending outbox records
    const pending = await getPendingOutboxCount();
    setOutboxCount(pending);

    setLoading(false);
  };

  const handleSyncOutbox = async () => {
    setSyncingOutbox(true);
    const res = await syncOutboxToServer(mobileAPI);
    setSyncingOutbox(false);
    const pending = await getPendingOutboxCount();
    setOutboxCount(pending);
    if (res.syncedOrders > 0 || res.syncedPayments > 0 || res.syncedVisits > 0) {
      Alert.alert(
        'Offline Outbox Synced! 🚀',
        `Successfully synced ${res.syncedOrders} orders, ${res.syncedPayments} payments, and ${res.syncedVisits} visits to Morbi Central Dispatch!`
      );
      await fetchAllData();
    } else if (res.errors.length > 0) {
      Alert.alert('Sync Waiting', 'Unable to reach server right now. Outbox will auto-sync when internet reconnects.');
    } else {
      Alert.alert('All Caught Up', 'All offline records are already synchronized.');
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, []);

  const handleSwitchBeat = (r) => {
    setRouteData(r);
    setSelectedRouteId(r ? r._id : 'ALL');
  };

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  }, [products]);

  const activeRoute = useMemo(() => {
    return allRoutes.find((r) => r._id === selectedRouteId) || routeData;
  }, [allRoutes, selectedRouteId, routeData]);

  const isShopAssignedToMe = useCallback(
    (s) => {
      if (!s || !user?._id) return false;
      const uid = user._id.toString();
      if (s.assignedSalesmen && Array.isArray(s.assignedSalesmen)) {
        if (s.assignedSalesmen.some((sm) => (sm?._id || sm)?.toString() === uid)) {
          return true;
        }
      }
      if (s.onboardedBy && (s.onboardedBy?._id || s.onboardedBy)?.toString() === uid) {
        return true;
      }
      return false;
    },
    [user?._id]
  );

  const myAssignedShopsCount = useMemo(() => {
    return shops.filter((s) => isShopAssignedToMe(s)).length;
  }, [shops, isShopAssignedToMe]);

  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = shops;

    if (activeRoute && selectedRouteId !== 'ALL' && !q) {
      base = base.filter((s) =>
        activeRoute.cities?.some((c) => c.toLowerCase() === s.city?.toLowerCase())
      );
    }

    if (shopScopeFilter === 'MY_SHOPS') {
      base = base.filter((s) => isShopAssignedToMe(s));
    }

    if (!q) return base;
    return base.filter(
      (s) =>
        s.shopName?.toLowerCase().includes(q) ||
        s.ownerName?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.city?.toLowerCase().includes(q)
    );
  }, [shops, activeRoute, selectedRouteId, searchQuery, shopScopeFilter, isShopAssignedToMe]);

  const filteredProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, catalogSearch, selectedCategory]);

  const phoneSearchResults = useMemo(() => {
    const q = phoneSearchQuery.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.shopName?.toLowerCase().includes(q) ||
        s.ownerName?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.city?.toLowerCase().includes(q)
    );
  }, [shops, phoneSearchQuery]);

  const handleSelectVariant = useCallback((productId, vIdx) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: vIdx }));
  }, []);

  const handleUpdateCart = useCallback((p, variant, delta, boxMultiplier = 1) => {
    const varName = variant ? variant.size : '';
    const itemKey = varName ? `${p._id}___${varName}` : p._id;
    const itemPrice = variant ? variant.basePrice : p.basePrice || 0;
    const itemBoxQty = variant ? variant.boxQuantity : p.boxQuantity || 1;
    const itemSku = variant ? variant.sku : p.sku || '';

    setCart((prev) => {
      const current = prev[itemKey]?.quantity || 0;
      const next = Math.max(0, current + delta * boxMultiplier);
      if (next === 0) {
        if (!prev[itemKey]) return prev;
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
          quantity: next,
        },
      };
    });
  }, []);

  const handleSetDirectQuantity = useCallback((p, variant, exactQty) => {
    const varName = variant ? variant.size : '';
    const itemKey = varName ? `${p._id}___${varName}` : p._id;
    const itemPrice = variant ? variant.basePrice : p.basePrice || 0;
    const itemBoxQty = variant ? variant.boxQuantity : p.boxQuantity || 1;
    const itemSku = variant ? variant.sku : p.sku || '';

    setCart((prev) => {
      const next = Math.max(0, exactQty);
      if (next === 0) {
        if (!prev[itemKey]) return prev;
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
          quantity: next,
        },
      };
    });
  }, []);

  let cartTotalAmount = 0;
  let cartTotalPcs = 0;
  Object.values(cart).forEach((item) => {
    cartTotalAmount += (item.price || 0) * (item.quantity || 0);
    cartTotalPcs += item.quantity || 0;
  });
  const cartSkuCount = Object.keys(cart).length;

  const handleOpenMap = useCallback((shop) => {
    const lat = shop.location?.latitude;
    const lng = shop.location?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open map navigation'));
    } else {
      Alert.alert('Notice', 'No GPS coordinates pinned for this shop.');
    }
  }, []);

  const handleCall = useCallback((phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot make call'));
  }, []);

  const handleWhatsApp = useCallback((shop) => {
    const cleanPhone = shop.phone?.replace(/[^0-9]/g, '');
    const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = `*SHIVAM MARKETING - WHOLESALE ORDER INQUIRY*\nNamaste ${shop.ownerName || ''} ji,\nThis is ${user?.name || 'your Sales Executive'} from Shivam Marketing.\nChecking in for today's wholesale order requirements for ${shop.shopName}.`;
    Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
  }, [user]);

  const handleCheckIn = useCallback(async (shop) => {
    setCheckInLoading(shop._id);
    try {
      const res = await mobileAPI.post('/visits/check-in', {
        shopId: shop._id,
        latitude: currentSalesmanCoords.latitude,
        longitude: currentSalesmanCoords.longitude,
        isMockLocationDetected: false,
        purpose: 'ORDER_AND_COLLECTION',
        notes: 'In-person beat check-in',
      });

      if (res.data.success) {
        const v = res.data.verification;
        if (v.isGeofenceVerified) {
          Alert.alert(
            'Visit Verified! ✅',
            `You are ${v.distanceMeters}m from ${shop.shopName}.\nGeofence check passed. You can now punch orders and collect payment.`
          );
        } else {
          Alert.alert(
            'Outside Geofence Warning ⚠️',
            `You are ${v.distanceMeters}m away from the shop (Allowed: ${v.thresholdMeters}m).\nThis visit will be flagged for Admin review.`
          );
        }
        await fetchAllData();
      }
    } catch (err) {
      Alert.alert('Check-in Error', err.response?.data?.message || 'Failed to verify visit');
    } finally {
      setCheckInLoading(null);
    }
  }, [fetchAllData]);

  // Render FlatList Catalog Item (2-Column Virtualized)
  const renderCatalogItem = useCallback(
    ({ item }) => {
      const hasVars = Boolean(item.hasVariants && item.variants?.length > 0);
      const currentVarIdx = selectedVariants[item._id] ?? 0;
      const activeVar = hasVars ? item.variants[currentVarIdx] || item.variants[0] : null;
      const itemKey = activeVar ? `${item._id}___${activeVar.size}` : item._id;
      const qtyInCart = cart[itemKey]?.quantity || 0;

      return (
        <GridProductCard
          product={item}
          selectedVarIdx={currentVarIdx}
          onSelectVariant={handleSelectVariant}
          qtyInCart={qtyInCart}
          onUpdateCart={handleUpdateCart}
          onSetDirectQuantity={handleSetDirectQuantity}
          onZoomPhoto={setZoomPhoto}
        />
      );
    },
    [selectedVariants, cart, handleSelectVariant, handleUpdateCart, handleSetDirectQuantity]
  );

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          {/* Logo Badge */}
          <View style={styles.logoBadgeContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          {/* Salesman Info & Financial Status */}
          <View style={styles.headerInfoCol}>
            <Text style={styles.salesmanGreeting} numberOfLines={1}>
              Namaste, {user?.name?.split(' ')[0] || 'Sales Executive'}
            </Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.cashChip}>
                <Text style={styles.cashChipLabel}>Cash: </Text>
                <Text style={styles.cashChipValue}>₹{user?.cashInHand?.toLocaleString() || 0}</Text>
              </View>
              <View style={styles.liveGpsBadge}>
                <View style={styles.liveGpsDot} />
                <Text style={styles.liveGpsText}>Live GPS</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons: Refresh & Log Out */}
          <View style={styles.headerActionsGroup}>
            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={onRefresh}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.refreshIconText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={onLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Offline Outbox Sync Banner */}
      {outboxCount > 0 && (
        <TouchableOpacity
          style={styles.outboxSyncBanner}
          onPress={handleSyncOutbox}
          disabled={syncingOutbox}
          activeOpacity={0.8}
        >
          <Text style={styles.outboxSyncText}>
            {syncingOutbox
              ? '🔄 Syncing records with Morbi Central Warehouse...'
              : `💾 ${outboxCount} Offline Records Queued • Tap to Sync 🚀`}
          </Text>
        </TouchableOpacity>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TODAY BEAT ROUTE & SHOPS */}
      {/* ========================================================================= */}
      {activeTab === 'BEAT' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Multi-Beat Switcher */}
          {allRoutes.length > 1 && (
            <View style={styles.beatSwitcherContainer}>
              <Text style={styles.sectionTitle}>🎯 Select Active Beat Route:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.beatSwitcherScroll}
              >
                {allRoutes.map((r) => {
                  const isSelected = selectedRouteId === r._id;
                  return (
                    <TouchableOpacity
                      key={r._id}
                      style={[styles.beatPill, isSelected && styles.beatPillActive]}
                      onPress={() => handleSwitchBeat(r)}
                    >
                      <Text style={[styles.beatPillText, isSelected && styles.beatPillTextActive]}>
                        📍 {r.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.beatPill, selectedRouteId === 'ALL' && styles.beatPillActive]}
                  onPress={() => handleSwitchBeat(null)}
                >
                  <Text style={[styles.beatPillText, selectedRouteId === 'ALL' && styles.beatPillTextActive]}>
                    🌐 All ({shops.length} Shops)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Current Beat Info Card */}
          <View style={styles.routeCard}>
            <View style={styles.routeHeaderRow}>
              <View style={styles.routeTitleGroup}>
                <Text style={styles.routeIcon}>🧭</Text>
                <Text style={styles.routeTitle}>
                  {selectedRouteId === 'ALL' ? 'All Assigned Territory' : routeData ? routeData.name : 'Today Beat'}
                </Text>
              </View>
              <View style={styles.shopCountBadge}>
                <Text style={styles.shopCountText}>{filteredShops.length} Shops</Text>
              </View>
            </View>
            <Text style={styles.routeMeta}>
              Coverage Cities: <Text style={styles.routeMetaBold}>{routeData?.cities?.join(', ') || 'Morbi, Wankaner, Rajkot'}</Text>
            </Text>
            <View style={styles.routeDivider} />
            <View style={styles.routeStatsRow}>
              <Text style={styles.routeVisitsText}>
                Visits Done: <Text style={styles.routeVisitsBold}>4 / {filteredShops.length}</Text>
              </Text>
              <Text style={styles.routeCollectedText}>
                Collected: ₹{user?.cashInHand ? user.cashInHand.toLocaleString() : '35,000'}
              </Text>
            </View>
          </View>

          {/* Sub-header with Title & Onboard Button */}
          <View style={styles.beatHeaderActionRow}>
            <Text style={styles.beatSectionHeading}>BEAT SHOPS LIST</Text>
            <TouchableOpacity style={styles.onboardBtn} onPress={onOpenRegisterShop}>
              <Text style={styles.onboardBtnText}>👤 + Onboard Shop</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Search & Filter Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchIconBadge}>
                <Text style={styles.searchIconGlyph}>🔍</Text>
              </View>
              <TextInput
                style={styles.searchInputField}
                placeholder="Search shop, owner, mobile, or city..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery?.length > 0 && (
                <TouchableOpacity
                  style={styles.searchClearBtn}
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.searchClearGlyph}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Scope Filter: My Assigned Shops vs All Beat Shops */}
          <View style={styles.shopScopeToggleRow}>
            <TouchableOpacity
              style={[styles.shopScopePill, shopScopeFilter === 'MY_SHOPS' && styles.shopScopePillActive]}
              onPress={() => setShopScopeFilter('MY_SHOPS')}
              activeOpacity={0.7}
            >
              <Text style={[styles.shopScopeText, shopScopeFilter === 'MY_SHOPS' && styles.shopScopeTextActive]}>
                ⭐ My Assigned Shops ({myAssignedShopsCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shopScopePill, shopScopeFilter === 'ALL' && styles.shopScopePillActive]}
              onPress={() => setShopScopeFilter('ALL')}
              activeOpacity={0.7}
            >
              <Text style={[styles.shopScopeText, shopScopeFilter === 'ALL' && styles.shopScopeTextActive]}>
                🌐 All Beat Shops ({shops.length})
              </Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator color="#0284c7" size="large" />
              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>
                Connecting to Morbi wholesale server...
              </Text>
            </View>
          ) : filteredShops.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyText}>
                {fetchError ? `${fetchError}\nSwipe down to retry.` : 'No retail shops found.'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                <Text style={styles.retryBtnText}>🔄 Tap to Reload Shops</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredShops.map((s) => (
              <ShopCard
                key={s._id}
                shop={s}
                isAssignedToMe={isShopAssignedToMe(s)}
                onCheckIn={handleCheckIn}
                checkInLoading={checkInLoading}
                onSelectShop={onSelectShop}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onOpenMap={handleOpenMap}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VIRTUALIZED HIGH-SPEED WHOLESALE CATALOG (FLATLIST 2-COLUMN) */}
      {/* ========================================================================= */}
      {activeTab === 'CATALOG' && (
        <FlatList
          data={filteredProducts}
          renderItem={renderCatalogItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.catalogColumnWrapper}
          contentContainerStyle={[
            styles.catalogListContent,
            cartSkuCount > 0 && { paddingBottom: 130 },
          ]}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 10 }}>
              <View style={styles.catalogHeader}>
                <Text style={styles.catalogTitle}>🛍️ Wholesale Product Catalog</Text>
                <Text style={styles.catalogSubtitle}>
                  Browse {products.length} bathware items, box packaging & punch orders
                </Text>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBarWrapper}>
                  <View style={styles.searchIconBadge}>
                    <Text style={styles.searchIconGlyph}>🔍</Text>
                  </View>
                  <TextInput
                    style={styles.searchInputField}
                    placeholder="Search Astral, Jaquar, bib cocks, basins..."
                    placeholderTextColor="#64748b"
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {catalogSearch?.length > 0 && (
                    <TouchableOpacity
                      style={styles.searchClearBtn}
                      onPress={() => setCatalogSearch('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.searchClearGlyph}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Category Pills Bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat === 'ALL' ? '🌟 All Items' : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>No products found matching your filter.</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setCatalogSearch('');
                  setSelectedCategory('ALL');
                }}
              >
                <Text style={styles.retryBtnText}>Clear Search & Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PHONE ORDER / CALLING SHEET (OFF-BEAT SEARCH) */}
      {/* ========================================================================= */}
      {activeTab === 'PHONE_SEARCH' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.phoneOrderHeader}>
            <Text style={styles.phoneOrderTitle}>📞 Remote Phone Order & Calling Sheet</Text>
            <Text style={styles.phoneOrderSubtitle}>
              Search any registered shop across all beats to take orders or collect payments over phone/WhatsApp without an in-person visit.
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchIconBadge}>
                <Text style={styles.searchIconGlyph}>🔍</Text>
              </View>
              <TextInput
                style={styles.searchInputField}
                placeholder="Search all shops (e.g. Radhe, Krishna, Morbi)..."
                placeholderTextColor="#64748b"
                value={phoneSearchQuery}
                onChangeText={setPhoneSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {phoneSearchQuery?.length > 0 && (
                <TouchableOpacity
                  style={styles.searchClearBtn}
                  onPress={() => setPhoneSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.searchClearGlyph}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.sectionHeader}>
            Assigned Retailers ({phoneSearchResults.length}):
          </Text>

          {phoneSearchResults.map((s) => (
            <View key={s._id} style={styles.phoneShopCard}>
              <View style={styles.phoneShopTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.phoneShopName}>{s.shopName}</Text>
                  <Text style={styles.phoneShopOwner}>
                    Prop: {s.ownerName} • 📞 {s.phone}
                  </Text>
                  <Text style={styles.phoneShopCity}>
                    📍 {s.address}, {s.city || 'Morbi'}
                  </Text>
                </View>
                <View style={styles.offBeatBadge}>
                  <Text style={styles.offBeatBadgeText}>📞 Off-Beat Call</Text>
                </View>
              </View>

              <View style={styles.phoneActionsRow}>
                <TouchableOpacity
                  style={styles.phoneOrderActionBtn}
                  onPress={() => onPunchOrder(s)}
                >
                  <Text style={styles.phoneOrderActionText}>🛒 Punch Phone Order</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.phoneCollectActionBtn}
                  onPress={() => onCollectPayment(s)}
                >
                  <Text style={styles.phoneCollectActionText}>💵 Remote Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COLLECTIONS & CASH IN HAND */}
      {/* ========================================================================= */}
      {activeTab === 'COLLECTIONS' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.collectionsHeaderCard}>
            <Text style={styles.collectionsCardLabel}>TODAY'S CASH IN HAND</Text>
            <Text style={styles.collectionsTotalCash}>
              ₹{user?.cashInHand?.toLocaleString() || 0}
            </Text>
            <View style={styles.collectionsDivider} />
            <View style={styles.collectionsSplitRow}>
              <View style={styles.collectionsSplitCol}>
                <Text style={styles.collectionsSplitLabel}>Rough Cash</Text>
                <Text style={styles.collectionsSplitRough}>
                  ₹{user?.cashInHand ? Math.round(user.cashInHand * 0.7).toLocaleString() : 0}
                </Text>
              </View>
              <View style={styles.collectionsSplitDivider} />
              <View style={styles.collectionsSplitCol}>
                <Text style={styles.collectionsSplitLabel}>GST UPI / Cheque</Text>
                <Text style={styles.collectionsSplitGst}>
                  ₹{user?.cashInHand ? Math.round(user.cashInHand * 0.3).toLocaleString() : 0}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeader}>Today's Payment Receipts ({payments.length}):</Text>

          {payments.length === 0 ? (
            <Text style={styles.emptyText}>No payment receipts logged today.</Text>
          ) : (
            payments.map((p) => (
              <View key={p._id} style={styles.receiptCard}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptNum}>{p.receiptNumber || 'RCP-2026-0001'}</Text>
                  <Text style={styles.receiptMode}>
                    {p.mode} {p.chequeNumber ? `(#${p.chequeNumber})` : ''}
                  </Text>
                </View>
                <Text style={styles.receiptMeta}>
                  Collected: {new Date(p.collectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • Book: {p.billType}
                </Text>
                <View style={styles.receiptFooter}>
                  <Text style={styles.receiptStatus}>Credited to Ledger</Text>
                  <Text style={styles.receiptAmount}>₹{p.amount?.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KPIS & DAILY TARGETS */}
      {/* ========================================================================= */}
      {activeTab === 'KPIS' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.kpiCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.kpiTitle}>🏆 Daily Field Sales Target</Text>
              <View style={styles.kpiTierBadge}>
                <Text style={styles.kpiTierText}>Top Performer</Text>
              </View>
            </View>

            {/* Progress 1: Collection */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.kpiProgressLabel}>Cash Collection Target</Text>
                <Text style={styles.kpiProgressValue}>₹35,000 / ₹50,000 (70%)</Text>
              </View>
              <View style={styles.kpiProgressBarBg}>
                <View style={[styles.kpiProgressBarFill, { width: '70%', backgroundColor: '#10b981' }]} />
              </View>
            </View>

            {/* Progress 2: Shop Visits */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.kpiProgressLabel}>In-Person Shop Visits</Text>
                <Text style={styles.kpiProgressValue}>4 / {filteredShops.length || 6} Shops (66%)</Text>
              </View>
              <View style={styles.kpiProgressBarBg}>
                <View style={[styles.kpiProgressBarFill, { width: '66%', backgroundColor: '#0284c7' }]} />
              </View>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiMetricCard}>
              <Text style={styles.kpiMetricLabel}>Phone Orders Taken</Text>
              <Text style={styles.kpiMetricValue}>2 Remote</Text>
            </View>
            <View style={styles.kpiMetricCard}>
              <Text style={styles.kpiMetricLabel}>New Shops Onboarded</Text>
              <Text style={styles.kpiMetricValue}>3 this week</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Floating Bottom Cart Bar */}
      {activeTab === 'CATALOG' && cartSkuCount > 0 && (
        <View style={styles.floatingCartBar}>
          <View>
            <Text style={styles.cartBarLabel}>🛒 {cartSkuCount} Products ({cartTotalPcs} pcs)</Text>
            <Text style={styles.cartBarTotal}>₹{cartTotalAmount.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBarBtn}
            onPress={() => {
              if (shops.length > 0) {
                onPunchOrder(shops[0]);
              } else {
                Alert.alert('Select Shop', 'Please select a shop to punch order.');
              }
            }}
          >
            <Text style={styles.cartBarBtnText}>Review & Punch &rarr;</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* PERSISTENT BOTTOM NAVIGATION BAR (5 TABS) */}
      {/* ========================================================================= */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('BEAT')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'BEAT' && styles.navIconActive]}>📍</Text>
          <Text style={[styles.navLabel, activeTab === 'BEAT' && styles.navLabelActive]}>
            Today Beat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('CATALOG')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'CATALOG' && styles.navIconActive]}>🛍️</Text>
          <Text style={[styles.navLabel, activeTab === 'CATALOG' && styles.navLabelActive]}>
            Catalog
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('PHONE_SEARCH')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'PHONE_SEARCH' && styles.navIconActive]}>📞</Text>
          <Text style={[styles.navLabel, activeTab === 'PHONE_SEARCH' && styles.navLabelActive]}>
            Phone Order
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('COLLECTIONS')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'COLLECTIONS' && styles.navIconActive]}>💵</Text>
          <Text style={[styles.navLabel, activeTab === 'COLLECTIONS' && styles.navLabelActive]}>
            Collections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('KPIS')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'KPIS' && styles.navIconActive]}>🏆</Text>
          <Text style={[styles.navLabel, activeTab === 'KPIS' && styles.navLabelActive]}>
            KPIs
          </Text>
        </TouchableOpacity>
      </View>

      <ImageZoomModal
        visible={!!zoomPhoto}
        photo={zoomPhoto}
        onClose={() => setZoomPhoto(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBadgeContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  headerInfoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  salesmanGreeting: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  cashChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cashChipLabel: {
    fontSize: 10,
    color: '#a7f3d0',
    fontWeight: '600',
  },
  cashChipValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34d399',
  },
  liveGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveGpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveGpsText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: 'bold',
  },
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshIconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshIconText: {
    fontSize: 12,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  outboxSyncBanner: {
    backgroundColor: '#b45309',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
  },
  outboxSyncText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 85,
  },
  catalogListContent: {
    padding: 12,
    paddingBottom: 85,
  },
  catalogColumnWrapper: {
    justifyContent: 'space-between',
  },
  beatSwitcherContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  beatSwitcherScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  beatPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  beatPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  beatPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  beatPillTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  routeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  routeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  routeIcon: {
    fontSize: 15,
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  shopCountBadge: {
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  shopCountText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  routeMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  routeMetaBold: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 8,
  },
  routeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeVisitsText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  routeVisitsBold: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  routeCollectedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34d399',
  },
  beatHeaderActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  beatSectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  onboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onboardBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIconBadge: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconGlyph: {
    fontSize: 14,
    opacity: 0.85,
  },
  searchInputField: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  searchClearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  searchClearGlyph: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0284c7',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shopCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  shopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  shopName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 18,
  },
  ownerText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  cityPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cityPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  myShopBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  myShopBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#c4b5fd',
  },
  shopScopeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  shopScopePill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopScopePillActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: '#8b5cf6',
  },
  shopScopeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  shopScopeTextActive: {
    fontWeight: 'bold',
    color: '#c4b5fd',
  },
  proximityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proximityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  proximityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInside: {
    backgroundColor: '#10b981',
  },
  dotOutside: {
    backgroundColor: '#ef4444',
  },
  proximityDistanceText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textInside: {
    color: '#34d399',
  },
  textOutside: {
    color: '#f87171',
  },
  proximityStatusText: {
    fontSize: 10,
    color: '#64748b',
  },
  directionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  directionLinkText: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  balanceGrid: {
    flexDirection: 'row',
    backgroundColor: '#090d16',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  balanceCol: {
    flex: 1,
    alignItems: 'center',
  },
  balanceColDivider: {
    width: 1,
    backgroundColor: '#1e293b',
    marginVertical: 2,
  },
  balanceLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  balanceValGst: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34d399',
  },
  balanceValRough: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  balanceValTotal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  checkInBtn: {
    flex: 1,
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  checkInBtnText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: 'bold',
  },
  visitShopBtn: {
    flex: 1.2,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitShopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  quickContactBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  quickContactText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  catalogHeader: {
    marginBottom: 8,
  },
  catalogTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  catalogSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  categoryChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  categoryChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'space-between',
  },
  gridCardDisabled: {
    opacity: 0.6,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  gridBrandBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridBrandBadgeText: {
    fontSize: 9,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  gridProdName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    minHeight: 32,
    lineHeight: 16,
  },
  gridProdCategory: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
    marginBottom: 4,
  },
  gridVariantScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  gridVarChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 4,
  },
  gridVarChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  gridVarChipText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  gridVarChipTextActive: {
    color: '#ffffff',
  },
  gridBoxTag: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  gridBoxTagText: {
    fontSize: 9,
    color: '#38bdf8',
    fontWeight: '600',
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  gridPriceUnit: {
    fontSize: 9,
    color: '#64748b',
  },
  gridOutOfStockBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  gridOutOfStockText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gridActionContainer: {
    gap: 4,
  },
  gridBoxBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  gridBoxBtnText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gridStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 2,
    height: 32,
  },
  gridStepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridStepperBtnText: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  gridStepperInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  gridStepperInput: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 26,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  gridStepperUnitText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 1,
  },
  phoneOrderHeader: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  phoneOrderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  phoneOrderSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 15,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  phoneShopCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  phoneShopTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phoneShopName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  phoneShopOwner: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  phoneShopCity: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  offBeatBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  offBeatBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  phoneActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  phoneOrderActionBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  phoneOrderActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  phoneCollectActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  phoneCollectActionText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  collectionsHeaderCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  collectionsCardLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  collectionsTotalCash: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#34d399',
    marginTop: 4,
  },
  collectionsDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  collectionsSplitRow: {
    flexDirection: 'row',
    width: '100%',
  },
  collectionsSplitCol: {
    flex: 1,
    alignItems: 'center',
  },
  collectionsSplitDivider: {
    width: 1,
    backgroundColor: '#1e293b',
  },
  collectionsSplitLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  collectionsSplitRough: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 2,
  },
  collectionsSplitGst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginTop: 2,
  },
  receiptCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  receiptNum: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  receiptMode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  receiptMeta: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 6,
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
  },
  receiptStatus: {
    fontSize: 10,
    color: '#94a3b8',
  },
  receiptAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  kpiCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  kpiTierBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiTierText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  kpiProgressLabel: {
    fontSize: 10,
    color: '#c084fc',
  },
  kpiProgressValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  kpiProgressBarBg: {
    height: 6,
    backgroundColor: '#1e1b4b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  kpiProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiMetricCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  kpiMetricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  kpiMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 66,
    left: 12,
    right: 12,
    backgroundColor: '#0284c7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  cartBarLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#e0f2fe',
  },
  cartBarTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cartBarBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cartBarBtnText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '800',
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 58,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 12 : 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  navIcon: {
    fontSize: 17,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  navLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
});
