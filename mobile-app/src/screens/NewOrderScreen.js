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

export const NewOrderScreen = ({ shop, onBack, onOrderSuccess }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [billType, setBillType] = useState('NON_GST');
  const [cart, setCart] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

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
        {/* Bill Type Selector */}
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
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 Search CPVC pipes, Jaquar taps, Cera fittings..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />

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

        {/* Product Catalog Grid */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 40 }} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No matching wholesale products found.</Text>
          </View>
        ) : (
          filteredProducts.map((p) => {
            const qtyInCart = cart[p._id] || 0;
            const isOutOfStock = p.isOutOfStock;
            const boxCount = Math.floor(qtyInCart / (p.boxQuantity || 1));
            const looseCount = qtyInCart % (p.boxQuantity || 1);

            return (
              <View
                key={p._id}
                style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}
              >
                <View style={styles.productMainRow}>
                  {/* Product Photo Thumbnail */}
                  <View style={styles.imageContainer}>
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
                  </View>

                  {/* Product Details */}
                  <View style={styles.productDetails}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.productCategory}>
                      Category: {p.category || 'Hardware'}
                    </Text>

                    <View style={styles.boxTag}>
                      <Text style={styles.boxTagText}>
                        📦 Master Box: {p.boxQuantity || 1} {p.uom || 'pcs'} (₹{((p.basePrice || 0) * (p.boxQuantity || 1)).toLocaleString()})
                      </Text>
                    </View>

                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>₹{p.basePrice?.toLocaleString()}</Text>
                      <Text style={styles.priceUnit}> / {p.uom || 'pc'}</Text>
                      <Text style={styles.taxNote}>
                        {billType === 'GST' ? ' (+18% GST)' : ' (Net Cash)'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Stock / Stepper Controls */}
                {isOutOfStock ? (
                  <View style={styles.outOfStockBanner}>
                    <Text style={styles.outOfStockText}>⚠️ Out of Stock at Warehouse</Text>
                  </View>
                ) : (
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.boxBtn}
                      onPress={() => handleUpdateCart(p._id, 1, p.boxQuantity || 1)}
                    >
                      <Text style={styles.boxBtnText}>+1 Full Box ({p.boxQuantity || 1} pcs)</Text>
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
          })
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
  productCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productMainRow: {
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  brandBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
  },
  productCategory: {
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
  },
  priceUnit: {
    fontSize: 11,
    color: '#94a3b8',
  },
  taxNote: {
    fontSize: 10,
    color: '#64748b',
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
  qtyControls: {
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
