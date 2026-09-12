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
  Linking,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const NewOrderScreen = ({ shop, onBack, onOrderSuccess }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [billType, setBillType] = useState('NON_GST');
  const [cart, setCart] = useState({});
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
        const orderNum = res.data.order?.orderNumber || 'ORD-NEW';
        Alert.alert(
          'Order Sent to Warehouse! 🚀',
          `Order ${orderNum} for ₹${totalAmount.toLocaleString()} has been punched to the warehouse dispatch desk.`,
          [
            {
              text: 'Share WhatsApp Bill 📲',
              onPress: () => {
                const msg = `*SHIVAM MARKETING - ORDER CONFIRMATION*\n------------------------------\n🏪 *Shop:* ${shop.shopName}\n📄 *Order No:* ${orderNum}\n📑 *Bill Type:* ${billType === 'GST' ? 'GST Invoice (+18%)' : 'Without GST (Rough Cash)'}\n📦 *Items Count:* ${totalItemCount}\n💰 *Total Amount:* ₹${totalAmount.toLocaleString()}\n🚚 *Status:* PUNCHED TO WAREHOUSE\n------------------------------\nThank you for your wholesale order!`;
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

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>&larr; Cancel</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Punch Order
          </Text>
          <Text style={styles.headerSubtitle}>{shop.shopName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bill Type Selector */}
        <View style={styles.billTypeContainer}>
          <Text style={styles.sectionLabel}>Select Billing Mode:</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pillBtn, billType === 'NON_GST' && styles.pillBtnActiveNonGst]}
              onPress={() => setBillType('NON_GST')}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  billType === 'NON_GST' && styles.pillBtnTextActive,
                ]}
              >
                Rough / Without GST
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, billType === 'GST' && styles.pillBtnActiveGst]}
              onPress={() => setBillType('GST')}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  billType === 'GST' && styles.pillBtnTextActive,
                ]}
              >
                GST Tax Bill (+18%)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Catalog */}
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 Search CPVC, pipes, taps, sanitaryware..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />

        {/* Product List */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 40 }} />
        ) : (
          filteredProducts.map((p) => {
            const qtyInCart = cart[p._id] || 0;
            const isOutOfStock = p.isOutOfStock;

            return (
              <View
                key={p._id}
                style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}
              >
                <View style={styles.productHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productMeta}>
                      {p.brand} • Box: {p.boxQuantity} {p.uom}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.productPrice}>₹{p.basePrice}</Text>
                    <Text style={styles.taxNote}>
                      {billType === 'GST' ? `+${p.gstPercentage || 18}% GST` : 'Net Price'}
                    </Text>
                  </View>
                </View>

                {isOutOfStock ? (
                  <Text style={styles.stockBadge}>⚠️ Out of Stock at Morbi Warehouse</Text>
                ) : (
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.boxBtn}
                      onPress={() => handleUpdateCart(p._id, 1, p.boxQuantity)}
                    >
                      <Text style={styles.boxBtnText}>+1 Box ({p.boxQuantity} pcs)</Text>
                    </TouchableOpacity>

                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateCart(p._id, -1, 1)}
                      >
                        <Text style={styles.stepperBtnText}>-</Text>
                      </TouchableOpacity>

                      <Text style={styles.stepperQty}>{qtyInCart}</Text>

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
            placeholder="e.g. Pack Jaquar fittings in wooden crate; deliver by 2 PM..."
            placeholderTextColor="#64748b"
            value={dispatchNotes}
            onChangeText={setDispatchNotes}
          />
        </View>
      </ScrollView>

      {/* Bottom Punch Order Bar */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>
            Total: {totalItemCount} Items ({billType === 'GST' ? 'GST Tax' : 'Rough'})
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
            <Text style={styles.submitBtnText}>Punch to Warehouse &rarr;</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  billTypeContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
  },
  productMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34d399',
  },
  taxNote: {
    fontSize: 10,
    color: '#64748b',
  },
  stockBadge: {
    fontSize: 11,
    color: '#f87171',
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
    paddingHorizontal: 12,
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
  stepperQty: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 28,
    textAlign: 'center',
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
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
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
