import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
  const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS', 'PAYMENTS', 'CATALOG'
  const [catalog, setCatalog] = useState([]);

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

      // If user has shopId, fetch shop details
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.shopName}>{shop?.shopName || 'My Retail Shop'}</Text>
          <Text style={styles.ownerSubtitle}>Owner: {user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <Text style={styles.duesNote}>
            * Salesman visits your shop on scheduled days for cash & cheque payment collections.
          </Text>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ORDERS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ORDERS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'ORDERS' && styles.tabBtnTextActive]}>
              My Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PAYMENTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PAYMENTS')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'PAYMENTS' && styles.tabBtnTextActive]}
            >
              Receipts ({payments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'CATALOG' && styles.tabBtnActive]}
            onPress={() => setActiveTab('CATALOG')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'CATALOG' && styles.tabBtnTextActive]}
            >
              Catalog ({catalog.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Views */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 30 }} />
        ) : activeTab === 'ORDERS' ? (
          orders.length === 0 ? (
            <Text style={styles.emptyText}>No orders recorded yet.</Text>
          ) : (
            orders.map((order) => (
              <View key={order._id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <Text style={styles.orderNum}>{order.orderNumber}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      order.status === 'DELIVERED'
                        ? styles.statusDelivered
                        : order.status === 'DISPATCHED'
                        ? styles.statusDispatched
                        : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{order.status}</Text>
                  </View>
                </View>

                {order.dispatchNotes && (
                  <View style={styles.dispatchBox}>
                    <Text style={styles.dispatchText}>🚚 {order.dispatchNotes}</Text>
                  </View>
                )}

                <View style={styles.orderItemsPreview}>
                  {order.items?.map((item, idx) => (
                    <Text key={idx} style={styles.itemLine}>
                      • {item.name} &times; {item.quantity} pcs
                    </Text>
                  ))}
                </View>

                <View style={styles.orderCardFooter}>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.orderAmount}>₹{order.totalAmount.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )
        ) : activeTab === 'PAYMENTS' ? (
          payments.length === 0 ? (
            <Text style={styles.emptyText}>No payment receipts logged yet.</Text>
          ) : (
            payments.map((p) => (
              <View key={p._id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <Text style={styles.orderNum}>{p.receiptNumber}</Text>
                  <Text style={styles.modeText}>{p.mode}</Text>
                </View>
                <View style={styles.orderCardFooter}>
                  <Text style={styles.orderDate}>
                    {new Date(p.collectedAt).toLocaleDateString('en-IN')} | {p.billType} Book
                  </Text>
                  <Text style={styles.paidAmount}>₹{p.amount.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )
        ) : (
          /* Catalog View */
          catalog.map((prod) => (
            <View key={prod._id} style={styles.catalogCard}>
              <View>
                <Text style={styles.catalogName}>{prod.name}</Text>
                <Text style={styles.catalogBrand}>
                  {prod.brand} • {prod.category}
                </Text>
                <Text style={styles.catalogBox}>
                  Standard Box: {prod.boxQuantity} {prod.uom}
                </Text>
              </View>
              <View style={styles.catalogPriceTag}>
                <Text style={styles.catalogPrice}>₹{prod.basePrice}</Text>
                <Text style={styles.catalogSub}>Wholesale Rate</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  ownerSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  logoutText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  duesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  duesHeaderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  duesRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dueCol: {
    alignItems: 'center',
  },
  dueLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  dueGst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  dueNonGst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  dueTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dueDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#334155',
  },
  duesNote: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 10,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#0f172a',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNum: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#ffffff',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusDispatched: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
  },
  statusDelivered: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dispatchBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  dispatchText: {
    fontSize: 11,
    color: '#38bdf8',
  },
  orderItemsPreview: {
    marginBottom: 8,
  },
  itemLine: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  orderDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: 'extrabold',
    color: '#ffffff',
  },
  modeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  paidAmount: {
    fontSize: 15,
    fontWeight: 'extrabold',
    color: '#34d399',
  },
  catalogCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catalogName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  catalogBrand: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
  },
  catalogBox: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  catalogPriceTag: {
    alignItems: 'flex-end',
  },
  catalogPrice: {
    fontSize: 15,
    fontWeight: 'extrabold',
    color: '#34d399',
  },
  catalogSub: {
    fontSize: 10,
    color: '#64748b',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 24,
  },
});
