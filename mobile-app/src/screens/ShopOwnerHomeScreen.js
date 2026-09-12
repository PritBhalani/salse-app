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
  Alert,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const ShopOwnerHomeScreen = ({ user, onLogout }) => {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CATALOG'); // Default to Quick Catalog
  const [catalog, setCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState({});
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, paymentsRes, productsRes] = await Promise.all([
        mobileAPI.get('/orders'),
        mobileAPI.get('/payments'),
        mobileAPI.get('/products'),
      ]);

      if (ordersRes.data.success) setOrders(ordersRes.data.orders || []);
      if (paymentsRes.data.success) setPayments(paymentsRes.data.payments || []);
      if (productsRes.data.success) setCatalog(productsRes.data.products || []);

      if (user?.shopId) {
        const shopId = typeof user.shopId === 'object' ? user.shopId._id : user.shopId;
        const sRes = await mobileAPI.get(`/shops/${shopId}`);
        if (sRes.data.success) {
          setShop(sRes.data.shop);
        }
      }
    } catch (err) {
      console.error('Error fetching shop owner portal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalDue = (shop?.gstBalance || 0) + (shop?.nonGstBalance || 0);
  const creditLimit = shop?.creditLimit || 150000;
  const availableCredit = Math.max(0, creditLimit - totalDue);
  const creditUsagePercent = Math.min(100, Math.round((totalDue / creditLimit) * 100));

  const categories = ['ALL', ...Array.from(new Set(catalog.map((p) => p.category).filter(Boolean)))];

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

  let cartSubtotal = 0;
  let cartTotalPcs = 0;
  Object.entries(cart).forEach(([prodId, qty]) => {
    const p = catalog.find((prod) => prod._id === prodId);
    if (p) {
      cartSubtotal += (p.basePrice || 0) * qty;
      cartTotalPcs += qty;
    }
  });
  const cartSkuCount = Object.keys(cart).length;

  const handleDirectOrder = async () => {
    if (cartSkuCount === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart.');
      return;
    }

    const items = Object.entries(cart).map(([productId, quantity]) => {
      const p = catalog.find((prod) => prod._id === productId);
      return {
        productId,
        quantity,
        boxCount: Math.ceil(quantity / (p.boxQuantity || 1)),
        customPrice: p.basePrice,
      };
    });

    setSubmittingOrder(true);
    try {
      const res = await mobileAPI.post('/orders', {
        shopId: shop?._id || user?.shopId,
        billType: 'NON_GST',
        items,
        dispatchNotes: 'Direct 1-Click Order from Shop Owner Mobile App (Blinkit Quick Re-order)',
      });

      if (res.data.success) {
        Alert.alert(
          'Restock Order Punched! 🚀',
          `Order ${res.data.order?.orderNumber} placed for ₹${cartSubtotal.toLocaleString()}. Morbi warehouse notified!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setCart({});
                fetchData();
                setActiveTab('DASHBOARD');
              },
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Order Failed', err.response?.data?.message || 'Server error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredCatalog = catalog.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.brand?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.category?.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>
            🏪 {shop?.shopName || 'Shri Krishna Hardware'}
          </Text>
          <Text style={styles.ownerSubtitle}>
            Owner: {user?.name || 'Retailer'} • Verified B2B Account
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, cartSkuCount > 0 && { paddingBottom: 110 }]}>
        {/* Credit Limit & Health Gauge Card */}
        <View style={styles.creditCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.creditTitle}>💳 Credit Limit Health Gauge</Text>
            <Text style={styles.creditLimitTotal}>Limit: ₹{creditLimit.toLocaleString()}</Text>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${creditUsagePercent}%` }]} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={styles.creditMeta}>Used: ₹{totalDue.toLocaleString()} ({creditUsagePercent}%)</Text>
            <Text style={styles.creditAvailable}>Available: ₹{availableCredit.toLocaleString()}</Text>
          </View>
        </View>

        {/* Outstanding Balances Card */}
        <View style={styles.duesCard}>
          <Text style={styles.duesHeaderTitle}>Account Statement & Outstanding Balance</Text>
          <View style={styles.duesRow}>
            <View style={styles.dueCol}>
              <Text style={styles.dueLabel}>GST Tax Due</Text>
              <Text style={styles.dueGst}>₹{shop?.gstBalance?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.dueDivider} />
            <View style={styles.dueCol}>
              <Text style={styles.dueLabel}>Rough / Cash Due</Text>
              <Text style={styles.dueNonGst}>₹{shop?.nonGstBalance?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.dueDivider} />
            <View style={styles.dueCol}>
              <Text style={styles.dueLabel}>Total Outstanding</Text>
              <Text style={styles.dueTotal}>₹{totalDue.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Live Order Dispatch Visual Tracking Card */}
        <View style={styles.dispatchCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.dispatchTitle}>🚚 Live Order Delivery Tracking</Text>
            <Text style={styles.dispatchOrderNum}>
              {orders.length > 0 ? orders[0].orderNumber : 'ORD-2026-0001'}
            </Text>
          </View>

          {/* 4-Step Dispatch Visual Timeline */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineStep}>
              <View style={[styles.stepCircle, styles.stepCircleDone]}>
                <Text style={styles.stepCircleText}>✓</Text>
              </View>
              <Text style={styles.stepLabelDone}>Punched</Text>
              <Text style={styles.stepTime}>09:15 AM</Text>
            </View>

            <View style={styles.timelineConnectorDone} />

            <View style={styles.timelineStep}>
              <View style={[styles.stepCircle, styles.stepCircleDone]}>
                <Text style={styles.stepCircleText}>✓</Text>
              </View>
              <Text style={styles.stepLabelDone}>Packed</Text>
              <Text style={styles.stepTime}>09:30 AM</Text>
            </View>

            <View style={styles.timelineConnectorActive} />

            <View style={styles.timelineStep}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Text style={styles.stepCircleText}>🚚</Text>
              </View>
              <Text style={styles.stepLabelActive}>On Route</Text>
              <Text style={styles.stepTime}>Driver: Amit</Text>
            </View>

            <View style={styles.timelineConnectorPending} />

            <View style={styles.timelineStep}>
              <View style={[styles.stepCircle, styles.stepCirclePending]}>
                <Text style={styles.stepCircleText}>○</Text>
              </View>
              <Text style={styles.stepLabelPending}>Delivered</Text>
              <Text style={styles.stepTime}>Est: 11:30</Text>
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'CATALOG' && styles.tabBtnActive]}
            onPress={() => setActiveTab('CATALOG')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'CATALOG' && styles.tabBtnTextActive]}>
              🛍️ Wholesale Catalog ({catalog.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'DASHBOARD' && styles.tabBtnActive]}
            onPress={() => setActiveTab('DASHBOARD')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'DASHBOARD' && styles.tabBtnTextActive]}>
              📦 Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PAYMENTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PAYMENTS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'PAYMENTS' && styles.tabBtnTextActive]}>
              📑 Receipts ({payments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {loading ? (
          <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 20 }} />
        ) : activeTab === 'CATALOG' ? (
          <View>
            {/* Search Catalog */}
            <TextInput
              style={styles.searchBar}
              placeholder="🔍 Search Astral CPVC, Jaquar, Cera, supreme..."
              placeholderTextColor="#64748b"
              value={catalogSearch}
              onChangeText={setCatalogSearch}
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

            {/* Catalog Grid */}
            {filteredCatalog.map((prod) => {
              const qtyInCart = cart[prod._id] || 0;
              const isOutOfStock = prod.isOutOfStock;
              const boxCount = Math.floor(qtyInCart / (prod.boxQuantity || 1));
              const looseCount = qtyInCart % (prod.boxQuantity || 1);

              return (
                <View key={prod._id} style={[styles.catalogCard, isOutOfStock && styles.catalogCardDisabled]}>
                  <View style={styles.catalogMainRow}>
                    {/* Photo thumbnail */}
                    <View style={styles.imageContainer}>
                      {prod.imageUrl ? (
                        <Image source={{ uri: prod.imageUrl }} style={styles.productImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Text style={styles.placeholderEmoji}>📦</Text>
                        </View>
                      )}
                      {prod.brand && (
                        <View style={styles.brandBadge}>
                          <Text style={styles.brandBadgeText}>{prod.brand}</Text>
                        </View>
                      )}
                    </View>

                    {/* Details */}
                    <View style={styles.catalogDetails}>
                      <Text style={styles.prodName}>{prod.name}</Text>
                      <Text style={styles.prodCategory}>{prod.category || 'Hardware'}</Text>
                      <View style={styles.boxTag}>
                        <Text style={styles.boxTagText}>
                          📦 Master Box: {prod.boxQuantity || 1} {prod.uom || 'pcs'} • ₹{((prod.basePrice || 0) * (prod.boxQuantity || 1)).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.prodPrice}>
                        ₹{prod.basePrice?.toLocaleString()} <Text style={styles.prodPriceUnit}>/ {prod.uom || 'pc'}</Text>
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
                        onPress={() => handleUpdateCart(prod._id, 1, prod.boxQuantity || 1)}
                      >
                        <Text style={styles.boxBtnText}>+1 Box ({prod.boxQuantity || 1} pcs)</Text>
                      </TouchableOpacity>

                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handleUpdateCart(prod._id, -1, 1)}
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
                          onPress={() => handleUpdateCart(prod._id, 1, 1)}
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
        ) : activeTab === 'DASHBOARD' ? (
          orders.length === 0 ? (
            <Text style={styles.emptyText}>No wholesale orders found.</Text>
          ) : (
            orders.map((o) => (
              <View key={o._id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNum}>{o.orderNumber}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{o.status}</Text>
                  </View>
                </View>
                <Text style={styles.orderMeta}>
                  Placed on: {new Date(o.createdAt).toLocaleDateString('en-IN')} | Bill: {o.billType}
                </Text>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderItems}>
                    {o.items?.length || 0} Products ({o.items?.reduce((s, i) => s + (i.boxCount || 1), 0)} Boxes)
                  </Text>
                  <Text style={styles.orderAmount}>₹{o.totalAmount?.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )
        ) : (
          payments.length === 0 ? (
            <Text style={styles.emptyText}>No payment receipts logged yet.</Text>
          ) : (
            payments.map((p) => (
              <View key={p._id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNum}>{p.receiptNumber}</Text>
                  <Text style={styles.paymentMode}>
                    {p.mode} {p.chequeNumber ? `(#${p.chequeNumber})` : ''}
                  </Text>
                </View>
                <Text style={styles.orderMeta}>
                  Collected: {new Date(p.collectedAt).toLocaleDateString('en-IN')} | Book: {p.billType}
                </Text>
                <View style={styles.orderFooter}>
                  <Text style={styles.paymentCredited}>Balance Credited</Text>
                  <Text style={styles.paidAmount}>₹{p.amount?.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Floating 1-Click Restock Bottom Bar (Blinkit style) */}
      {cartSkuCount > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartBarLabel}>🛒 {cartSkuCount} Products ({cartTotalPcs} pcs)</Text>
            <Text style={styles.cartBarTotal}>₹{cartSubtotal.toLocaleString()}</Text>
          </View>

          <TouchableOpacity
            style={[styles.cartBarBtn, submittingOrder && styles.cartBarBtnDisabled]}
            onPress={handleDirectOrder}
            disabled={submittingOrder}
          >
            {submittingOrder ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.cartBarBtnText}>1-Click Restock &rarr;</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ownerSubtitle: {
    fontSize: 11,
    color: '#a5b4fc',
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    paddingBottom: 40,
  },
  creditCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  creditTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#c7d2fe',
    textTransform: 'uppercase',
  },
  creditLimitTotal: {
    fontSize: 11,
    color: '#e0e7ff',
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#312e81',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#818cf8',
    borderRadius: 4,
  },
  creditMeta: {
    fontSize: 11,
    color: '#a5b4fc',
  },
  creditAvailable: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34d399',
  },
  duesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  duesHeaderTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  duesRow: {
    flexDirection: 'row',
  },
  dueCol: {
    flex: 1,
    alignItems: 'center',
  },
  dueDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  dueLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  dueGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  dueNonGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  dueTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f87171',
  },
  dispatchCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dispatchTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    textTransform: 'uppercase',
  },
  dispatchOrderNum: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timelineStep: {
    alignItems: 'center',
    minWidth: 54,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleDone: {
    backgroundColor: '#059669',
  },
  stepCircleActive: {
    backgroundColor: '#d97706',
  },
  stepCirclePending: {
    backgroundColor: '#334155',
  },
  stepCircleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepLabelDone: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#34d399',
  },
  stepLabelActive: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  stepLabelPending: {
    fontSize: 9,
    color: '#64748b',
  },
  stepTime: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 1,
  },
  timelineConnectorDone: {
    flex: 1,
    height: 2,
    backgroundColor: '#059669',
    marginBottom: 16,
  },
  timelineConnectorActive: {
    flex: 1,
    height: 2,
    backgroundColor: '#d97706',
    marginBottom: 16,
  },
  timelineConnectorPending: {
    flex: 1,
    height: 2,
    backgroundColor: '#334155',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: {
    backgroundColor: '#4338ca',
    borderColor: '#6366f1',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#ffffff',
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
    backgroundColor: '#4338ca',
    borderColor: '#818cf8',
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
    backgroundColor: '#312e81',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  boxBtnText: {
    color: '#a5b4fc',
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
    color: '#818cf8',
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
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statusBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  orderItems: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  paymentMode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  paymentCredited: {
    fontSize: 11,
    color: '#34d399',
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
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
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartBarLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cartBarTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34d399',
  },
  cartBarBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cartBarBtnDisabled: {
    opacity: 0.6,
  },
  cartBarBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
