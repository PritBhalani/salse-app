import React, { useState, useEffect } from 'react';
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
  Alert,
  Linking,
} from 'react-native';
import { mobileAPI } from '../config/api';
import { ImageZoomModal } from '../components/ImageZoomModal';

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
      }
    } catch (err) {
      console.warn('Error loading catalog:', err.message);
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
          gstPercentage: p.gstPercentage || 18,
          quantity: next,
        },
      };
    });
  };

  // Extract categories dynamically
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

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
      Alert.alert('Order Punching Failed', err.response?.data?.message || 'Server error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0284c7']}
            tintColor="#38bdf8"
          />
        }
      >
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

        {/* 2-Column Product Catalog Grid (Flipkart / Blinkit Style) */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 40 }} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No matching wholesale products found.</Text>
          </View>
        ) : (
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
        )}

        {/* Dispatch Instruction */}
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
      </ScrollView>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
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
    fontSize: 12,
    color: '#38bdf8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  channelContainer: {
    marginBottom: 14,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  channelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  channelBtnActiveBeat: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  channelBtnActivePhone: {
    backgroundColor: '#3b0764',
    borderColor: '#a855f7',
  },
  channelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  channelBtnTextActive: {
    color: '#ffffff',
  },
  billTypeContainer: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillBtnTextActive: {
    color: '#ffffff',
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
    marginBottom: 12,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
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
  notesContainer: {
    marginTop: 16,
  },
  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34d399',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
