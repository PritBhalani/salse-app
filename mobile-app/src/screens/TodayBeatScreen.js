import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { mobileAPI } from '../config/api';
import { ImageZoomModal } from '../components/ImageZoomModal';

export const TodayBeatScreen = ({
  user,
  onSelectShop,
  onPunchOrder,
  onCollectPayment,
  onOpenRegisterShop,
  onLogout,
}) => {
  // Navigation tab for salesman
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
  const [fetchError, setFetchError] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  // Cart state for standalone Catalog tab
  const [cart, setCart] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});

  // Simulated salesman current coordinates (Morbi market: 22.8125, 70.8355)
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

    // 2. Fetch Shops
    try {
      const shopRes = await mobileAPI.get(
        `/shops?salesmanLat=${currentSalesmanCoords.latitude}&salesmanLng=${currentSalesmanCoords.longitude}`
      );
      if (shopRes.data?.success) {
        setShops(shopRes.data.shops || []);
      }
    } catch (e) {
      console.warn('Could not fetch shops:', e.message);
      setFetchError(e.message || 'Network error connecting to cloud backend');
    }

    // 3. Fetch Products Catalog
    try {
      const prodRes = await mobileAPI.get('/products');
      if (prodRes.data?.success) {
        setProducts(prodRes.data.products || []);
      }
    } catch (e) {
      console.warn('Could not fetch products:', e.message);
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

    setLoading(false);
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

  // Categories
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  // Filter shops based on selected route cities or search
  const activeRoute = allRoutes.find((r) => r._id === selectedRouteId) || routeData;
  const baseShops =
    activeRoute && selectedRouteId !== 'ALL' && !searchQuery
      ? shops.filter((s) =>
          activeRoute.cities?.some((c) => c.toLowerCase() === s.city?.toLowerCase())
        )
      : shops;

  const filteredShops = searchQuery
    ? shops.filter(
        (s) =>
          s.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.phone?.includes(searchQuery) ||
          s.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : baseShops;

  // Phone Order Off-Beat Shop Search
  const phoneSearchResults = phoneSearchQuery
    ? shops.filter(
        (s) =>
          s.shopName?.toLowerCase().includes(phoneSearchQuery.toLowerCase()) ||
          s.ownerName?.toLowerCase().includes(phoneSearchQuery.toLowerCase()) ||
          s.phone?.includes(phoneSearchQuery) ||
          s.city?.toLowerCase().includes(phoneSearchQuery.toLowerCase())
      )
    : shops;

  // Filter Catalog Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.brand?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.category?.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleUpdateCart = (p, variant, delta, boxMultiplier = 1) => {
    const varName = variant ? variant.size : '';
    const itemKey = varName ? `${p._id}___${varName}` : p._id;
    const itemPrice = variant ? variant.basePrice : p.basePrice || 0;
    const itemBoxQty = variant ? variant.boxQuantity : p.boxQuantity || 1;
    const itemSku = variant ? variant.sku : p.sku || '';

    setCart((prev) => {
      const current = prev[itemKey]?.quantity || 0;
      const next = Math.max(0, current + delta * boxMultiplier);
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
          quantity: next,
        },
      };
    });
  };

  let cartTotalAmount = 0;
  let cartTotalPcs = 0;
  Object.values(cart).forEach((item) => {
    cartTotalAmount += (item.price || 0) * (item.quantity || 0);
    cartTotalPcs += item.quantity || 0;
  });
  const cartSkuCount = Object.keys(cart).length;

  const handleOpenMap = (shop) => {
    const lat = shop.location?.latitude;
    const lng = shop.location?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open map navigation'));
    } else {
      Alert.alert('Notice', 'No GPS coordinates pinned for this shop.');
    }
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot make call'));
  };

  const handleWhatsApp = (shop) => {
    const cleanPhone = shop.phone?.replace(/[^0-9]/g, '');
    const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = `*SHIVAM MARKETING - WHOLESALE ORDER INQUIRY*\nNamaste ${shop.ownerName || ''} ji,\nThis is ${user?.name || 'your Sales Executive'} from Shivam Marketing.\nChecking in for today's wholesale order requirements for ${shop.shopName}.`;
    Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
  };

  const handleCheckIn = async (shop) => {
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
  };

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

      {/* Main Content Area Based on Active Bottom Tab */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, cartSkuCount > 0 && activeTab === 'CATALOG' && { paddingBottom: 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* ========================================================================= */}
        {/* TAB 1: TODAY BEAT ROUTE & SHOPS */}
        {/* ========================================================================= */}
        {activeTab === 'BEAT' && (
          <View>
            {/* Multi-Beat Switcher (If salesman is assigned 2+ beats) */}
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

            {/* Current Beat Info Card (Simulator Style) */}
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
              filteredShops.map((s, index) => {
                const distance = s.distanceMeters !== undefined ? s.distanceMeters : 45;
                const isInsideGeofence = distance <= 250;
                const totalDue = (s.gstBalance || 0) + (s.nonGstBalance || 0);

                return (
                  <View key={s._id} style={styles.shopCard}>
                    {/* Header with Shop Name and City Pill */}
                    <View style={styles.shopCardHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.shopName} numberOfLines={1}>
                          {s.shopName}
                        </Text>
                        <Text style={styles.ownerText}>
                          {s.ownerName || 'Proprietor'} • {s.city || 'Morbi'}
                        </Text>
                      </View>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{s.city || 'Morbi'}</Text>
                      </View>
                    </View>

                    {/* Proximity Pill & Google Maps Directions Link */}
                    <View style={styles.proximityRow}>
                      <View style={styles.proximityGroup}>
                        <Text style={isInsideGeofence ? styles.proximityDotNear : styles.proximityDotFar}>
                          {isInsideGeofence ? '🟢' : '🟡'}
                        </Text>
                        <Text style={[styles.proximityText, isInsideGeofence ? styles.textNear : styles.textFar]}>
                          {isInsideGeofence ? '28m away (At Shop)' : `${distance > 1000 ? (distance / 1000).toFixed(1) + 'km' : distance + 'm'} away`}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleOpenMap(s)}>
                        <Text style={styles.directionsLink}>🗺️ Directions</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Dual Balance Matrix (3 Columns in slate-950) */}
                    <View style={styles.balanceMatrix}>
                      <View style={styles.balanceCol}>
                        <Text style={styles.balanceLabel}>GST Due</Text>
                        <Text style={styles.balanceValGst}>₹{(s.gstBalance || 0).toLocaleString()}</Text>
                      </View>
                      <View style={styles.balanceColDivider} />
                      <View style={styles.balanceCol}>
                        <Text style={styles.balanceLabel}>Rough Due</Text>
                        <Text style={styles.balanceValRough}>₹{(s.nonGstBalance || 0).toLocaleString()}</Text>
                      </View>
                      <View style={styles.balanceColDivider} />
                      <View style={styles.balanceCol}>
                        <Text style={styles.balanceLabel}>Total Due</Text>
                        <Text style={styles.balanceValTotal}>₹{totalDue.toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* Primary Field Action Buttons (GPS Check-In & Visit Shop) */}
                    <View style={styles.actionButtonRow}>
                      <TouchableOpacity
                        style={styles.checkInBtn}
                        onPress={() => handleCheckIn(s)}
                        disabled={checkInLoading === s._id}
                      >
                        {checkInLoading === s._id ? (
                          <ActivityIndicator color="#34d399" size="small" />
                        ) : (
                          <Text style={styles.checkInBtnText}>📍 GPS Check-In</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.visitShopBtn}
                        onPress={() => onSelectShop(s)}
                      >
                        <Text style={styles.visitShopBtnText}>Visit Shop &rarr;</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Quick Contact Icons Row */}
                    <View style={styles.quickContactRow}>
                      <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleCall(s.phone)}>
                        <Text style={styles.quickContactText}>📞 Call Owner</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleWhatsApp(s)}>
                        <Text style={styles.quickContactText}>📲 WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VISUAL WHOLESALE CATALOG (2-COLUMN FLIPKART / BLINKIT GRID) */}
        {/* ========================================================================= */}
        {activeTab === 'CATALOG' && (
          <View>
            <View style={styles.catalogHeader}>
              <Text style={styles.catalogTitle}>🛍️ Wholesale Product Catalog</Text>
              <Text style={styles.catalogSubtitle}>
                Browse full bathware inventory, box packaging specs & take orders
              </Text>
            </View>

            {/* Catalog Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBarWrapper}>
                <View style={styles.searchIconBadge}>
                  <Text style={styles.searchIconGlyph}>🔍</Text>
                </View>
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Search Astral CPVC, Jaquar bib cocks, Cera..."
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

            {/* 2-Column Product Catalog Grid (Flipkart / Blinkit Style) */}
            <View style={styles.catalogGrid}>
              {filteredProducts.map((p) => {
                const hasVars = Boolean(p.hasVariants && p.variants?.length > 0);
                const currentVarIdx = selectedVariants[p._id] ?? 0;
                const activeVar = hasVars ? p.variants[currentVarIdx] || p.variants[0] : null;

                const activePrice = activeVar ? activeVar.basePrice : p.basePrice || 0;
                const activeBoxQty = activeVar ? activeVar.boxQuantity : p.boxQuantity || 1;
                const isOutOfStock = activeVar ? activeVar.isOutOfStock : p.isOutOfStock;

                const itemKey = activeVar ? `${p._id}___${activeVar.size}` : p._id;
                const qtyInCart = cart[itemKey]?.quantity || 0;

                return (
                  <View
                    key={p._id}
                    style={[styles.gridCard, isOutOfStock && styles.gridCardDisabled]}
                  >
                    <View>
                      {/* Square Photo Container with Tap to Zoom & Brand Tag */}
                      <TouchableOpacity
                        style={styles.gridImageContainer}
                        activeOpacity={p.imageUrl ? 0.75 : 1}
                        onPress={() => {
                          if (p.imageUrl) {
                            setZoomPhoto({
                              url: p.imageUrl,
                              name: p.name,
                              brand: p.brand,
                              price: activePrice,
                            });
                          }
                        }}
                      >
                        {p.imageUrl ? (
                          <Image source={{ uri: p.imageUrl }} style={styles.gridImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Text style={styles.placeholderEmoji}>🚿</Text>
                          </View>
                        )}
                        {p.brand ? (
                          <View style={styles.gridBrandBadge}>
                            <Text style={styles.gridBrandBadgeText}>{p.brand}</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>

                      {/* Title & Category */}
                      <Text style={styles.gridProdName} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={styles.gridProdCategory} numberOfLines={1}>
                        {p.category || 'Hardware'}
                      </Text>

                      {/* Size Variant Chips */}
                      {hasVars && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridVariantScroll}>
                          {p.variants.map((v, vIdx) => {
                            const isSelected = currentVarIdx === vIdx;
                            return (
                              <TouchableOpacity
                                key={v.size || vIdx}
                                style={[styles.gridVarChip, isSelected && styles.gridVarChipActive]}
                                onPress={() => setSelectedVariants((prev) => ({ ...prev, [p._id]: vIdx }))}
                              >
                                <Text style={[styles.gridVarChipText, isSelected && styles.gridVarChipTextActive]}>
                                  {v.size}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}

                      {/* Master Box Info & Price */}
                      <View style={styles.gridBoxTag}>
                        <Text style={styles.gridBoxTagText}>
                          📦 Box: {activeBoxQty} pcs • ₹{((activePrice || 0) * activeBoxQty).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.gridPriceRow}>
                        <Text style={styles.gridPrice}>₹{activePrice?.toLocaleString()}</Text>
                        <Text style={styles.gridPriceUnit}> / {p.uom || 'pc'}</Text>
                      </View>
                    </View>

                    {/* Stepper / Controls */}
                    {isOutOfStock ? (
                      <View style={styles.gridOutOfStockBanner}>
                        <Text style={styles.gridOutOfStockText}>Out of Stock</Text>
                      </View>
                    ) : (
                      <View style={styles.gridActionContainer}>
                        <TouchableOpacity
                          style={styles.gridBoxBtn}
                          onPress={() => handleUpdateCart(p, activeVar, 1, activeBoxQty)}
                        >
                          <Text style={styles.gridBoxBtnText}>+1 Box ({activeBoxQty} pcs)</Text>
                        </TouchableOpacity>

                        <View style={styles.gridStepper}>
                          <TouchableOpacity
                            style={styles.gridStepperBtn}
                            onPress={() => handleUpdateCart(p, activeVar, -1, 1)}
                          >
                            <Text style={styles.gridStepperBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.gridStepperQty}>
                            {qtyInCart} pcs
                          </Text>
                          <TouchableOpacity
                            style={styles.gridStepperBtn}
                            onPress={() => handleUpdateCart(p, activeVar, 1, 1)}
                          >
                            <Text style={styles.gridStepperBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PHONE ORDER / CALLING SHEET (OFF-BEAT SEARCH) */}
        {/* ========================================================================= */}
        {activeTab === 'PHONE_SEARCH' && (
          <View>
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

                {/* Direct Remote Action Buttons */}
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
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COLLECTIONS & CASH IN HAND */}
        {/* ========================================================================= */}
        {activeTab === 'COLLECTIONS' && (
          <View>
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
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: KPIS & DAILY TARGETS */}
        {/* ========================================================================= */}
        {activeTab === 'KPIS' && (
          <View>
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
                  <Text style={styles.kpiProgressValue}>4 / 6 Shops (66%)</Text>
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
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Cart Bar (When in CATALOG tab with items in cart) */}
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
        >
          <Text style={[styles.navIcon, activeTab === 'BEAT' && styles.navIconActive]}>📍</Text>
          <Text style={[styles.navLabel, activeTab === 'BEAT' && styles.navLabelActive]}>
            Today Beat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('CATALOG')}
        >
          <Text style={[styles.navIcon, activeTab === 'CATALOG' && styles.navIconActive]}>🛍️</Text>
          <Text style={[styles.navLabel, activeTab === 'CATALOG' && styles.navLabelActive]}>
            Catalog
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('PHONE_SEARCH')}
        >
          <Text style={[styles.navIcon, activeTab === 'PHONE_SEARCH' && styles.navIconActive]}>📞</Text>
          <Text style={[styles.navLabel, activeTab === 'PHONE_SEARCH' && styles.navLabelActive]}>
            Phone Order
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('COLLECTIONS')}
        >
          <Text style={[styles.navIcon, activeTab === 'COLLECTIONS' && styles.navIconActive]}>💵</Text>
          <Text style={[styles.navLabel, activeTab === 'COLLECTIONS' && styles.navLabelActive]}>
            Collections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('KPIS')}
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
  variantContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  variantLabel: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variantScroll: {
    flexDirection: 'row',
  },
  variantChip: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    alignItems: 'center',
    position: 'relative',
  },
  variantChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  variantChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  variantChipTextActive: {
    color: '#ffffff',
  },
  variantChipPrice: {
    fontSize: 10,
    fontWeight: '600',
    color: '#34d399',
    marginTop: 2,
  },
  variantChipPriceActive: {
    color: '#e0f2fe',
  },
  variantBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  variantBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },

  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
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
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIconText: {
    fontSize: 14,
  },
  logoutBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  beatSwitcherContainer: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  beatSwitcherScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  beatPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  beatPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  beatPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  beatPillTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  routeCard: {
    backgroundColor: '#081e36',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
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
    fontSize: 14,
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  shopCountBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  shopCountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  routeMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  routeMetaBold: {
    color: '#e2e8f0',
    fontWeight: 'bold',
  },
  routeDivider: {
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    marginVertical: 8,
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
    color: '#ffffff',
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
    marginBottom: 10,
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
    marginBottom: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
  searchBar: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    fontSize: 13,
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
  proximityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proximityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proximityDotNear: {
    fontSize: 10,
  },
  proximityDotFar: {
    fontSize: 10,
  },
  proximityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textNear: {
    color: '#34d399',
  },
  textFar: {
    color: '#fbbf24',
  },
  directionsLink: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  balanceMatrix: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  },
  balanceLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
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
    paddingVertical: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.18)',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  checkInBtnText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  visitShopBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitShopBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickContactBtn: {
    flex: 1,
    paddingVertical: 5,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  quickContactText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  catalogHeader: {
    marginBottom: 10,
  },
  catalogTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  catalogSubtitle: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'space-between',
  },
  gridCardDisabled: {
    opacity: 0.55,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#020617',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridBrandBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(12, 74, 110, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  gridBrandBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  gridProdName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
    lineHeight: 16,
  },
  gridProdCategory: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 4,
  },
  gridVariantScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  gridVarChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#020617',
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
    backgroundColor: '#020617',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 4,
  },
  gridBoxTagText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  gridPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  gridPriceUnit: {
    fontSize: 9,
    color: '#94a3b8',
  },
  gridOutOfStockBanner: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  gridOutOfStockText: {
    color: '#f87171',
    fontSize: 9,
    fontWeight: 'bold',
  },
  gridActionContainer: {
    gap: 4,
  },
  gridBoxBtn: {
    width: '100%',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  gridBoxBtnText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  gridStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 2,
  },
  gridStepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridStepperBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  gridStepperQty: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  phoneOrderHeader: {
    backgroundColor: '#2e1065',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  phoneOrderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e9d5ff',
  },
  phoneOrderSubtitle: {
    fontSize: 10,
    color: '#c084fc',
    marginTop: 2,
    lineHeight: 14,
  },
  phoneShopCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  phoneShopTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  phoneShopName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  phoneShopOwner: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  phoneShopCity: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  offBeatBadge: {
    backgroundColor: '#3b0764',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7e22ce',
  },
  offBeatBadgeText: {
    color: '#d8b4fe',
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
    backgroundColor: '#9333ea',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneOrderActionText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  phoneCollectActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneCollectActionText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: 'bold',
  },
  collectionsHeaderCard: {
    backgroundColor: '#064e3b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#059669',
  },
  collectionsCardLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#a7f3d0',
    letterSpacing: 1,
  },
  collectionsTotalCash: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 4,
  },
  collectionsDivider: {
    height: 1,
    backgroundColor: '#059669',
    marginVertical: 8,
  },
  collectionsSplitRow: {
    flexDirection: 'row',
  },
  collectionsSplitCol: {
    flex: 1,
  },
  collectionsSplitDivider: {
    width: 1,
    backgroundColor: '#059669',
  },
  collectionsSplitLabel: {
    fontSize: 10,
    color: '#a7f3d0',
  },
  collectionsSplitRough: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fef08a',
    marginTop: 2,
  },
  collectionsSplitGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  receiptCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
    color: '#94a3b8',
    marginBottom: 6,
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
  },
  receiptStatus: {
    fontSize: 10,
    color: '#34d399',
  },
  receiptAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  kpiCard: {
    backgroundColor: '#2e1065',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#581c87',
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d8b4fe',
  },
  kpiTierBadge: {
    backgroundColor: '#7e22ce',
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
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 16,
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
