import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { mobileAPI } from '../config/api';
import { ImageZoomModal } from '../components/ImageZoomModal';
import {
  queueOfflineOrder,
  saveLocalCatalog,
  getLocalCatalog,
} from '../utils/offlineSync';

// =========================================================================
// MEMOIZED HIGH-PERFORMANCE 2-COLUMN ORDER PRODUCT CARD
// =========================================================================
const OrderProductCard = React.memo(
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

    return (
      <View style={[styles.gridCard, isOutOfStock && styles.gridCardDisabled]}>
        <View>
          {/* Square Photo Container with Tap to Zoom & Brand Tag */}
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
              <Image source={{ uri: product.imageUrl }} style={styles.gridImage} resizeMode="cover" />
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

          {/* Size Variant Chips */}
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
            <Text style={styles.gridBoxTagText} numberOfLines={1}>
              📦 Box: {activeBoxQty} pcs • ₹{((activePrice || 0) * activeBoxQty).toLocaleString()}
            </Text>
          </View>
          <View style={styles.gridPriceRow}>
            <Text style={styles.gridPrice}>₹{activePrice?.toLocaleString()}</Text>
            <Text style={styles.gridPriceUnit}> / {product.uom || 'pc'}</Text>
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
              <View style={styles.gridStepperInputContainer}>
                <TextInput
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
              </View>
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
  }
);

export const NewOrderScreen = ({ shop, onBack, onOrderSuccess }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [billType, setBillType] = useState('NON_GST');
  const [orderChannel, setOrderChannel] = useState('IN_PERSON_BEAT'); // 'IN_PERSON_BEAT' or 'PHONE_ORDER'
  const [cart, setCart] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await mobileAPI.get('/products');
      if (res.data.success) {
        setProducts(res.data.products || []);
        await saveLocalCatalog(res.data.products || []);
      }
    } catch (err) {
      console.warn('Network offline, loading cached catalog:', err.message);
      const cached = await getLocalCatalog();
      if (cached?.length > 0) {
        setProducts(cached);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  useEffect(() => {
    setLoading(true);
    fetchProducts();
  }, []);

  const handleSelectVariant = useCallback((prodId, vIdx) => {
    setSelectedVariants((prev) => ({ ...prev, [prodId]: vIdx }));
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
          gstPercentage: p.gstPercentage || 18,
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
          gstPercentage: p.gstPercentage || 18,
          quantity: next,
        },
      };
    });
  }, []);

  // Extract categories dynamically
  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  }, [products]);

  // Calculate Cart Totals
  let subtotal = 0;
  let gstTotal = 0;
  let totalPcsCount = 0;

  Object.values(cart).forEach((item) => {
    const itemSub = (item.price || 0) * (item.quantity || 0);
    subtotal += itemSub;
    totalPcsCount += item.quantity || 0;
    if (billType === 'GST') {
      gstTotal += Math.round((itemSub * (item.gstPercentage || 18)) / 100);
    }
  });

  const totalAmount = subtotal + gstTotal;
  const totalItemCount = Object.keys(cart).length;

  const handleSubmitOrder = async () => {
    if (totalItemCount === 0) {
      Alert.alert('Cart is Empty', 'Please select at least 1 product from the catalog.');
      return;
    }

    const items = Object.values(cart).map((item) => {
      return {
        productId: item.productId,
        variantName: item.variantName || '',
        sku: item.sku || '',
        quantity: item.quantity,
        boxCount: Math.ceil(item.quantity / (item.boxQuantity || 1)),
        customPrice: item.price,
      };
    });

    setSubmitting(true);
    try {
      const res = await mobileAPI.post('/orders', {
        shopId: shop._id,
        billType,
        channel: orderChannel,
        items,
        dispatchNotes,
      });

      if (res.data.success) {
        const orderNum = res.data.order?.orderNumber || 'ORD-NEW';
        Alert.alert(
          'Order Sent to Warehouse! 🚀',
          `Order ${orderNum} for ₹${totalAmount.toLocaleString()} has been punched to Morbi warehouse dispatch.`,
          [
            {
              text: 'Share WhatsApp Bill 📲',
              onPress: () => {
                const msg = `*SHIVAM MARKETING - ORDER CONFIRMATION*\n------------------------------\n🏪 *Shop:* ${shop.shopName}\n📄 *Order No:* ${orderNum}\n📑 *Bill Type:* ${billType === 'GST' ? 'GST Invoice (+18%)' : 'Without GST (Rough Cash)'}\n📦 *Items:* ${totalItemCount} SKU (${totalPcsCount} pcs)\n💰 *Total Amount:* ₹${totalAmount.toLocaleString()}\n🚚 *Status:* PUNCHED TO MORBI WAREHOUSE\n------------------------------\nThank you for your wholesale order!`;
                const cleanPhone = shop.phone?.replace(/[^0-9]/g, '');
                const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
                Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
                onOrderSuccess();
              },
            },
            {
              text: 'Done',
              onPress: () => onOrderSuccess(),
            },
          ]
        );
      }
    } catch (err) {
      // Network offline or error - save to local offline outbox queue
      const queued = await queueOfflineOrder({
        shopId: shop._id,
        shopName: shop.shopName,
        billType,
        channel: orderChannel,
        items,
        dispatchNotes,
        totalAmount,
      });

      if (queued) {
        const orderNum = queued.localId;
        Alert.alert(
          'Order Saved in Offline Outbox! 💾',
          `No network detected. Order ${orderNum} for ₹${totalAmount.toLocaleString()} has been safely saved on this device and queued to auto-sync when internet connects.`,
          [
            {
              text: 'Share WhatsApp Bill 📲',
              onPress: () => {
                const msg = `*SHIVAM MARKETING - OFFLINE ORDER CONFIRMATION*\n------------------------------\n🏪 *Shop:* ${shop.shopName}\n📄 *Order No:* ${orderNum} (Offline Queued)\n📑 *Bill Type:* ${billType === 'GST' ? 'GST Invoice (+18%)' : 'Without GST (Rough Cash)'}\n📦 *Items:* ${totalItemCount} SKU (${totalPcsCount} pcs)\n💰 *Total Amount:* ₹${totalAmount.toLocaleString()}\n🚚 *Status:* SAVED LOCALLY (Auto-syncs on network)\n------------------------------\nThank you for your wholesale order!`;
                const cleanPhone = shop.phone?.replace(/[^0-9]/g, '');
                const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
                Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
                onOrderSuccess();
              },
            },
            {
              text: 'OK',
              onPress: () => onOrderSuccess(),
            },
          ]
        );
      } else {
        Alert.alert('Order Punching Failed', err.response?.data?.message || 'Server error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const renderCatalogItem = useCallback(
    ({ item }) => {
      const hasVars = Boolean(item.hasVariants && item.variants?.length > 0);
      const currentVarIdx = selectedVariants[item._id] ?? 0;
      const activeVar = hasVars ? item.variants[currentVarIdx] || item.variants[0] : null;
      const itemKey = activeVar ? `${item._id}___${activeVar.size}` : item._id;
      const qtyInCart = cart[itemKey]?.quantity || 0;

      return (
        <OrderProductCard
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            📸 Wholesale Catalog & Order
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {shop.shopName} • {shop.city || 'Morbi'}
          </Text>
        </View>
      </View>

      {/* Virtualized 2-Column Catalog FlatList */}
      <FlatList
        data={filteredProducts}
        renderItem={renderCatalogItem}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.catalogColumnWrapper}
        contentContainerStyle={[styles.catalogListContent, { paddingBottom: 110 }]}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0284c7']}
            tintColor="#38bdf8"
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            {/* Order Channel Switcher (Simulator Style) */}
            <View style={styles.channelContainer}>
              <Text style={styles.sectionLabel}>Order Channel:</Text>
              <View style={styles.channelRow}>
                <TouchableOpacity
                  style={[styles.channelBtn, orderChannel === 'IN_PERSON_BEAT' && styles.channelBtnActiveBeat]}
                  onPress={() => setOrderChannel('IN_PERSON_BEAT')}
                >
                  <Text style={[styles.channelBtnText, orderChannel === 'IN_PERSON_BEAT' && styles.channelBtnTextActive]}>
                    📍 Beat Visit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.channelBtn, orderChannel === 'PHONE_ORDER' && styles.channelBtnActivePhone]}
                  onPress={() => setOrderChannel('PHONE_ORDER')}
                >
                  <Text style={[styles.channelBtnText, orderChannel === 'PHONE_ORDER' && styles.channelBtnTextActive]}>
                    📞 Phone (No Visit)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bill Type Selector (Simulator Style) */}
            <View style={styles.billTypeContainer}>
              <Text style={styles.sectionLabel}>Select Billing Mode:</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[styles.pillBtn, billType === 'NON_GST' && styles.pillBtnActiveNonGst]}
                  onPress={() => setBillType('NON_GST')}
                >
                  <Text style={[styles.pillBtnText, billType === 'NON_GST' && styles.pillBtnTextActive]}>
                    💵 Rough / Cash (No GST)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillBtn, billType === 'GST' && styles.pillBtnActiveGst]}
                  onPress={() => setBillType('GST')}
                >
                  <Text style={[styles.pillBtnText, billType === 'GST' && styles.pillBtnTextActive]}>
                    🏛️ GST Tax Bill (+18%)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Catalog */}
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchIconBadge}>
                <Text style={styles.searchIconGlyph}>🔍</Text>
              </View>
              <TextInput
                style={styles.searchInputField}
                placeholder="Search CPVC pipes, Jaquar taps, Cera fittings..."
                placeholderTextColor="#64748b"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search?.length > 0 && (
                <TouchableOpacity
                  style={styles.searchClearBtn}
                  onPress={() => setSearch('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.searchClearGlyph}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Category Pills Bar (Blinkit style) */}
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
          </View>
        }
        ListFooterComponent={
          <View style={styles.notesContainer}>
            <Text style={styles.sectionLabel}>Dispatch / Packaging Instructions:</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Pack in wooden crate; deliver by 2 PM via Patel Transport..."
              placeholderTextColor="#64748b"
              value={dispatchNotes}
              onChangeText={setDispatchNotes}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>No matching wholesale products found.</Text>
            </View>
          )
        }
      />

      {/* Bottom Cart Drawer Bar */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>
            🛒 {totalItemCount} Items ({totalPcsCount} pcs) • {billType === 'GST' ? 'GST Tax' : 'Rough Cash'}
          </Text>
          <Text style={styles.footerTotal}>₹{totalAmount.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmitOrder}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Punch Order &rarr;</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    minHeight: 56,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 1,
  },
  catalogListContent: {
    padding: 12,
    paddingBottom: 110,
  },
  catalogColumnWrapper: {
    justifyContent: 'space-between',
  },
  channelContainer: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  channelBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  channelBtnActiveBeat: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  channelBtnActivePhone: {
    backgroundColor: '#4c1d95',
    borderColor: '#8b5cf6',
  },
  channelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  channelBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  billTypeContainer: {
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pillBtnActiveNonGst: {
    backgroundColor: '#78350f',
    borderColor: '#f59e0b',
  },
  pillBtnActiveGst: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  pillBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  pillBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
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
    marginBottom: 10,
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
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 4,
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
    opacity: 0.55,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    marginBottom: 8,
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
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gridBrandBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#38bdf8',
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
  notesContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 99,
  },
  footerLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  footerTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
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
  },
});
