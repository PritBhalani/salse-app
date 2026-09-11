import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const NewOrderScreen = ({ shop, onBack, onOrderSuccess }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [billType, setBillType] = useState('NON_GST'); // Default per wholesale flow
  const [cart, setCart] = useState({}); // { [productId]: quantity }
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await mobileAPI.get('/products');
      if (res.data.success) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleUpdateCart = (productId, delta, boxQty = 1) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta * boxQty);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Calculate Cart Totals
  let subtotal = 0;
  let gstTotal = 0;

  Object.entries(cart).forEach(([prodId, qty]) => {
    const p = products.find((prod) => prod._id === prodId);
    if (p) {
      const itemSub = p.basePrice * qty;
      subtotal += itemSub;
      if (billType === 'GST') {
        gstTotal += Math.round((itemSub * (p.gstPercentage || 18)) / 100);
      }
    }
  });

  const totalAmount = subtotal + gstTotal;
  const totalItemCount = Object.keys(cart).length;

  const handleSubmitOrder = async () => {
    if (totalItemCount === 0) {
      Alert.alert('Cart is Empty', 'Please select at least 1 product.');
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

    setSubmitting(true);
    try {
      const res = await mobileAPI.post('/orders', {
        shopId: shop._id,
        billType,
        items,
        dispatchNotes,
      });

      if (res.data.success) {
        Alert.alert(
          'Order Sent to Warehouse! 🚀',
          `Order ${res.data.order.orderNumber} for ₹${totalAmount.toLocaleString()} has been placed.\nThe warehouse team has been notified in real-time.`
        );
        onOrderSuccess();
      }
    } catch (err) {
      Alert.alert('Order Failed', err.response?.data?.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            New Order: {shop.shopName}
          </Text>
          <Text style={styles.headerSubtitle}>{shop.city}</Text>
        </View>
      </View>

      {/* Bill Type Selector (GST vs Without GST) */}
      <View style={styles.billingTypeContainer}>
        <Text style={styles.billingTypeLabel}>Select Billing Mode:</Text>
        <View style={styles.billingTypeButtons}>
          <TouchableOpacity
            style={[
              styles.billModeBtn,
              billType === 'NON_GST' && styles.billModeBtnActiveNonGst,
            ]}
            onPress={() => setBillType('NON_GST')}
          >
            <Text
              style={[
                styles.billModeBtnText,
                billType === 'NON_GST' && styles.billModeBtnTextActive,
              ]}
            >
              Without GST (Rough)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.billModeBtn,
              billType === 'GST' && styles.billModeBtnActiveGst,
            ]}
            onPress={() => setBillType('GST')}
          >
            <Text
              style={[
                styles.billModeBtnText,
                billType === 'GST' && styles.billModeBtnTextActive,
              ]}
            >
              GST Tax Bill (+18%)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Filter */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search pipes, Jaquar faucets, valves..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Products Catalog List */}
      <ScrollView contentContainerStyle={styles.catalogList}>
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 30 }} />
        ) : (
          filteredProducts.map((product) => {
            const qtyInCart = cart[product._id] || 0;
            const isOutOfStock = product.isOutOfStock || product.stockQuantity <= 0;

            return (
              <View
                key={product._id}
                style={[
                  styles.productCard,
                  isOutOfStock && styles.productCardDisabled,
                ]}
              >
                <View style={styles.productHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productBrand}>
                      {product.brand} • {product.category}
                    </Text>
                    <Text style={styles.productBoxInfo}>
                      Box Packaging: {product.boxQuantity} {product.uom}/Box
                    </Text>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceValue}>₹{product.basePrice}</Text>
                    <Text style={styles.priceSubtext}>
                      {billType === 'GST' ? '+18% GST' : 'Net'}
                    </Text>
                  </View>
                </View>

                {/* Stock status or Add to Cart Controls */}
                <View style={styles.cartControlRow}>
                  {isOutOfStock ? (
                    <Text style={styles.outOfStockLabel}>⚠️ Out of Stock at Warehouse</Text>
                  ) : (
                    <>
                      {/* Box adder shortcuts */}
                      <TouchableOpacity
                        style={styles.boxAddBtn}
                        onPress={() => handleUpdateCart(product._id, 1, product.boxQuantity)}
                      >
                        <Text style={styles.boxAddBtnText}>
                          +1 Box ({product.boxQuantity} pcs)
                        </Text>
                      </TouchableOpacity>

                      {/* Quantity Stepper */}
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handleUpdateCart(product._id, -1, 1)}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>

                        <Text style={styles.stepperQty}>{qtyInCart} Pcs</Text>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handleUpdateCart(product._id, 1, 1)}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Dispatch Notes Input */}
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Special Dispatch Instructions for Warehouse:</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={2}
            placeholder="e.g. Urgent delivery by Thursday tempo, double packaging"
            placeholderTextColor="#64748b"
            value={dispatchNotes}
            onChangeText={setDispatchNotes}
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom Cart Bar */}
      {totalItemCount > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartTotalLabel}>
              {totalItemCount} Items ({billType === 'GST' ? 'GST Invoice' : 'Rough Bill'})
            </Text>
            <Text style={styles.cartTotalAmount}>₹{totalAmount.toLocaleString()}</Text>
          </View>

          <TouchableOpacity
            style={styles.submitOrderBtn}
            onPress={handleSubmitOrder}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitOrderBtnText}>Punch to Warehouse &rarr;</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  billingTypeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
  },
  billingTypeLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 6,
  },
  billingTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  billModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  billModeBtnActiveNonGst: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  billModeBtnActiveGst: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  billModeBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  billModeBtnTextActive: {
    color: '#ffffff',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catalogList: {
    padding: 16,
    paddingBottom: 90,
  },
  productCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  productBrand: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
  },
  productBoxInfo: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  priceTag: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'extrabold',
    color: '#ffffff',
  },
  priceSubtext: {
    fontSize: 10,
    color: '#94a3b8',
  },
  cartControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  outOfStockLabel: {
    fontSize: 11,
    color: '#f87171',
    fontWeight: 'bold',
  },
  boxAddBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  boxAddBtnText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  stepperContainer: {
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepperQty: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34d399',
    paddingHorizontal: 8,
  },
  notesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notesLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 12,
    textAlignVertical: 'top',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartTotalLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  cartTotalAmount: {
    fontSize: 18,
    fontWeight: 'extrabold',
    color: '#34d399',
  },
  submitOrderBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitOrderBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
