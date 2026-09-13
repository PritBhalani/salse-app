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
        <Image
          source={require('../../assets/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <View style={styles.userRow}>
            <Text style={styles.salesmanGreeting}>Namaste, {user?.name?.split(' ')[0] || 'Sales Executive'}</Text>
            <View style={styles.liveGpsBadge}>
              <Text style={styles.liveGpsText}>🟢 GPS Live (12m)</Text>
            </View>
          </View>
          <View style={styles.cashRow}>
            <Text style={styles.cashBadgeLabel}>Cash in Hand:</Text>
            <Text style={styles.cashValue}>₹{user?.cashInHand?.toLocaleString() || 0}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
            <Text style={styles.refreshIconText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
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

            {/* Current Beat Info Card */}
            <View style={styles.routeCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.routeTitle}>
                  {selectedRouteId === 'ALL' ? '🌐 All Assigned Territory' : routeData ? routeData.name : 'Today Beat'}
                </Text>
                <View style={styles.shopCountBadge}>
                  <Text style={styles.shopCountText}>{filteredShops.length} Shops</Text>
                </View>
              </View>
              <Text style={styles.routeMeta}>
                Coverage Cities: {routeData?.cities?.join(', ') || 'Morbi, Wankaner, Rajkot'}
              </Text>
            </View>

            {/* Quick Search & Filter Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder="🔍 Search shop name, owner, phone number..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Action Bar: Register New Shop */}
            <TouchableOpacity style={styles.registerShopBtn} onPress={onOpenRegisterShop}>
              <Text style={styles.registerShopBtnText}>➕ Onboard New Retail Shop in Field</Text>
            </TouchableOpacity>

            {/* Retail Shops List */}
            <Text style={styles.sectionHeader}>
              {searchQuery ? `Search Results (${filteredShops.length})` : 'Shops on Route:'}
            </Text>

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
                    {/* Header with Distance Badge */}
                    <View style={styles.shopCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.shopIndex}>#{index + 1}</Text>
                          <Text style={styles.shopName} numberOfLines={1}>
                            {s.shopName}
                          </Text>
                        </View>
                        <Text style={styles.ownerText}>
                          👤 {s.ownerName || 'Proprietor'} • 📞 {s.phone}
                        </Text>
                        <Text style={styles.addressText} numberOfLines={1}>
                          📍 {s.address || 'Main Market'}, {s.city || 'Morbi'}
                        </Text>
                      </View>

                      {/* Geofence Distance Pill */}
                      <View style={[styles.distancePill, isInsideGeofence ? styles.distanceInside : styles.distanceOutside]}>
                        <Text style={[styles.distancePillText, isInsideGeofence ? styles.textInside : styles.textOutside]}>
                          {distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance}m`}
                        </Text>
                        <Text style={styles.geofenceLabel}>
                          {isInsideGeofence ? '✓ Geofence OK' : '⚠️ Off-Site'}
                        </Text>
                      </View>
                    </View>

                    {/* Ledger Balance Pill */}
                    <View style={styles.ledgerRow}>
                      <View style={styles.ledgerItem}>
                        <Text style={styles.ledgerLabel}>GST Due:</Text>
                        <Text style={styles.ledgerGst}>₹{s.gstBalance?.toLocaleString() || 0}</Text>
                      </View>
                      <View style={styles.ledgerDivider} />
                      <View style={styles.ledgerItem}>
                        <Text style={styles.ledgerLabel}>Rough Cash Due:</Text>
                        <Text style={styles.ledgerNonGst}>₹{s.nonGstBalance?.toLocaleString() || 0}</Text>
                      </View>
                      <View style={styles.ledgerDivider} />
                      <View style={styles.ledgerItem}>
                        <Text style={styles.ledgerLabel}>Total Due:</Text>
                        <Text style={styles.ledgerTotal}>₹{totalDue.toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* Quick Action Icons: Call, WhatsApp, Navigation */}
                    <View style={styles.quickContactRow}>
                      <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleCall(s.phone)}>
                        <Text style={styles.quickContactText}>📞 Call Owner</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleWhatsApp(s)}>
                        <Text style={styles.quickContactText}>📲 WhatsApp</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleOpenMap(s)}>
                        <Text style={styles.quickContactText}>🗺️ Maps Nav</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Card Action Buttons */}
                    <View style={styles.actionButtonRow}>
                      <TouchableOpacity
                        style={styles.checkInBtn}
                        onPress={() => handleCheckIn(s)}
                        disabled={checkInLoading === s._id}
                      >
                        {checkInLoading === s._id ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={styles.checkInBtnText}>📍 GPS Check-In</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => onSelectShop(s)}
                      >
                        <Text style={styles.detailBtnText}>Open Shop &rarr;</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VISUAL WHOLESALE CATALOG (Blinkit / Flipkart Style) */}
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
            <TextInput
              style={styles.searchBar}
              placeholder="🔍 Search Astral CPVC, Jaquar bib cocks, Cera basins..."
              placeholderTextColor="#64748b"
              value={catalogSearch}
              onChangeText={setCatalogSearch}
            />

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

            {/* Product Cards */}
            {filteredProducts.map((p) => {
              const qtyInCart = cart[p._id] || 0;
              const isOutOfStock = p.isOutOfStock;
              const boxCount = Math.floor(qtyInCart / (p.boxQuantity || 1));
              const looseCount = qtyInCart % (p.boxQuantity || 1);

              return (
                <View
                  key={p._id}
                  style={[styles.catalogCard, isOutOfStock && styles.catalogCardDisabled]}
                >
                  <View style={styles.catalogMainRow}>
                    {/* Photo thumbnail */}
                    <TouchableOpacity
                      style={styles.imageContainer}
                      activeOpacity={p.imageUrl ? 0.75 : 1}
                      onPress={() => {
                        if (p.imageUrl) {
                          setZoomPhoto({
                            url: p.imageUrl,
                            name: p.name,
                            brand: p.brand,
                            price: p.basePrice,
                          });
                        }
                      }}
                    >
                      {p.imageUrl ? (
                        <Image source={{ uri: p.imageUrl }} style={styles.productImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Text style={styles.placeholderEmoji}>🚿</Text>
                        </View>
                      )}
                      {p.brand && (
                        <View style={styles.brandBadge}>
                          <Text style={styles.brandBadgeText}>{p.brand}</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Details */}
                    <View style={styles.catalogDetails}>
                      <Text style={styles.prodName}>{p.name}</Text>
                      <Text style={styles.prodCategory}>{p.category || 'Hardware'}</Text>
                      <View style={styles.boxTag}>
                        <Text style={styles.boxTagText}>
                          📦 Master Box: {p.boxQuantity || 1} {p.uom || 'pcs'} • ₹{((p.basePrice || 0) * (p.boxQuantity || 1)).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.prodPrice}>
                        ₹{p.basePrice?.toLocaleString()} <Text style={styles.prodPriceUnit}>/ {p.uom || 'pc'}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Stepper / Controls */}
                  {isOutOfStock ? (
                    <View style={styles.outOfStockBanner}>
                      <Text style={styles.outOfStockText}>⚠️ Out of Stock at Morbi Warehouse</Text>
                    </View>
                  ) : (
                    <View style={styles.catalogQtyControls}>
                      <TouchableOpacity
                        style={styles.boxBtn}
                        onPress={() => handleUpdateCart(p._id, 1, p.boxQuantity || 1)}
                      >
                        <Text style={styles.boxBtnText}>+1 Box ({p.boxQuantity || 1} pcs)</Text>
                      </TouchableOpacity>

                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handleUpdateCart(p._id, -1, 1)}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>

                        <View style={styles.stepperQtyContainer}>
                          <Text style={styles.stepperQty}>{qtyInCart} pcs</Text>
                          {qtyInCart > 0 && (
                            <Text style={styles.stepperSubtext}>
                              ({boxCount}b {looseCount > 0 ? `+${looseCount}p` : ''})
                            </Text>
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handleUpdateCart(p._id, 1, 1)}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
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

            <TextInput
              style={styles.searchBar}
              placeholder="🔍 Search all shops (e.g. Radhe, Krishna, Morbi, Rajkot)..."
              placeholderTextColor="#64748b"
              value={phoneSearchQuery}
              onChangeText={setPhoneSearchQuery}
            />

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salesmanGreeting: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  liveGpsBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveGpsText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cashBadgeLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cashValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34d399',
  },
  refreshIconBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshIconText: {
    fontSize: 13,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 12,
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
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
  },
  shopCountText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  routeMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  registerShopBtn: {
    backgroundColor: '#065f46',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  registerShopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 10,
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
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  shopIndex: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  shopName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ownerText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
  addressText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  distancePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  distanceInside: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
  },
  distanceOutside: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  distancePillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textInside: {
    color: '#34d399',
  },
  textOutside: {
    color: '#f87171',
  },
  geofenceLabel: {
    fontSize: 8,
    color: '#cbd5e1',
    marginTop: 1,
  },
  ledgerRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ledgerItem: {
    flex: 1,
    alignItems: 'center',
  },
  ledgerDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  ledgerLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  ledgerGst: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34d399',
  },
  ledgerNonGst: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  ledgerTotal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f87171',
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  quickContactBtn: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickContactText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkInBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  checkInBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    alignItems: 'center',
  },
  detailBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  catalogHeader: {
    marginBottom: 12,
  },
  catalogTitle: {
    fontSize: 16,
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
    marginBottom: 14,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  catalogCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catalogCardDisabled: {
    opacity: 0.5,
  },
  catalogMainRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  imageContainer: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  brandBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  brandBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  catalogDetails: {
    flex: 1,
  },
  prodName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
  },
  prodCategory: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  boxTag: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  boxTagText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '600',
  },
  prodPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
  },
  prodPriceUnit: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'normal',
  },
  outOfStockBanner: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  outOfStockText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  catalogQtyControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  boxBtn: {
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  boxBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepperBtnText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepperQtyContainer: {
    alignItems: 'center',
    minWidth: 44,
  },
  stepperQty: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepperSubtext: {
    color: '#a5b4fc',
    fontSize: 9,
  },
  phoneOrderHeader: {
    marginBottom: 12,
  },
  phoneOrderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c084fc',
  },
  phoneOrderSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  phoneShopCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  phoneShopTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  phoneShopName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  phoneShopOwner: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
  phoneShopCity: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  offBeatBadge: {
    backgroundColor: '#3b0764',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7e22ce',
  },
  offBeatBadgeText: {
    color: '#d8b4fe',
    fontSize: 10,
    fontWeight: 'bold',
  },
  phoneActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  phoneOrderActionBtn: {
    flex: 1,
    backgroundColor: '#7e22ce',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneOrderActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  phoneCollectActionBtn: {
    flex: 1,
    backgroundColor: '#065f46',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneCollectActionText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  collectionsHeaderCard: {
    backgroundColor: '#064e3b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 24,
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
  receiptCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  receiptNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  receiptMode: {
    fontSize: 11,
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
    borderTopColor: '#334155',
    paddingTop: 6,
  },
  receiptStatus: {
    fontSize: 10,
    color: '#34d399',
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  kpiCard: {
    backgroundColor: '#2e1065',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
    fontSize: 11,
    color: '#c084fc',
  },
  kpiProgressValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  kpiProgressBarBg: {
    height: 8,
    backgroundColor: '#1e1b4b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  kpiProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiMetricCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiMetricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  kpiMetricValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    backgroundColor: '#064e3b',
    borderTopWidth: 1,
    borderTopColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartBarLabel: {
    fontSize: 11,
    color: '#a7f3d0',
  },
  cartBarTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cartBarBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cartBarBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
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
