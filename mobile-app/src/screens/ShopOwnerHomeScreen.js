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
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD', 'ORDERS', 'PAYMENTS', 'CATALOG'
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

  const handleQuickReorder = (prod) => {
    Alert.alert(
      'Restock Request 🚀',
      `Send restock request for 1 Box of ${prod.name} (${prod.boxQuantity} pcs) to Shivam Warehouse?`,
      [
        {
          text: 'Send to Warehouse',
          onPress: () => {
            Alert.alert('Request Sent ✅', 'Warehouse dispatcher notified for rapid packing.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.shopName}>{shop?.shopName || 'Shri Krishna Hardware'}</Text>
          <Text style={styles.ownerSubtitle}>Owner: {user?.name} • Verified Retailer</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Credit Limit & Health Gauge Card */}
        <View style={styles.creditCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.creditTitle}>Credit Limit Health Gauge</Text>
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
            <Text style={styles.dispatchOrderNum}>ORD-2026-0001</Text>
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
            style={[styles.tabBtn, activeTab === 'DASHBOARD' && styles.tabBtnActive]}
            onPress={() => setActiveTab('DASHBOARD')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'DASHBOARD' && styles.tabBtnTextActive]}>
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PAYMENTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PAYMENTS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'PAYMENTS' && styles.tabBtnTextActive]}>
              Receipts ({payments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'CATALOG' && styles.tabBtnActive]}
            onPress={() => setActiveTab('CATALOG')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'CATALOG' && styles.tabBtnTextActive]}>
              Fast Re-Order
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {loading ? (
          <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 20 }} />
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
        ) : activeTab === 'PAYMENTS' ? (
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
        ) : (
          catalog.slice(0, 6).map((prod) => (
            <View key={prod._id} style={styles.catalogCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{prod.name}</Text>
                <Text style={styles.prodMeta}>{prod.brand} • Box: {prod.boxQuantity} pcs</Text>
                <Text style={styles.prodPrice}>₹{prod.basePrice} / pc</Text>
              </View>
              <TouchableOpacity
                style={styles.reorderBtn}
                onPress={() => handleQuickReorder(prod)}
              >
                <Text style={styles.reorderBtnText}>+ Re-Order</Text>
              </TouchableOpacity>
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
    color: '#f8fafc',
  },
  dispatchCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  dispatchTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  dispatchOrderNum: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    width: 58,
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
    backgroundColor: '#0284c7',
  },
  stepCirclePending: {
    backgroundColor: '#1e293b',
  },
  stepCircleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepLabelDone: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#34d399',
  },
  stepLabelActive: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  stepLabelPending: {
    fontSize: 10,
    color: '#64748b',
  },
  stepTime: {
    fontSize: 9,
    color: '#64748b',
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
    backgroundColor: '#0284c7',
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#0f172a',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabBtnTextActive: {
    color: '#818cf8',
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
    marginBottom: 6,
  },
  orderNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  statusBadge: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#a5b4fc',
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  orderItems: {
    fontSize: 11,
    color: '#64748b',
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#818cf8',
  },
  paymentMode: {
    fontSize: 11,
    color: '#a5b4fc',
    fontWeight: 'bold',
  },
  paymentCredited: {
    fontSize: 11,
    color: '#34d399',
  },
  paidAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34d399',
  },
  catalogCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prodName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  prodMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  prodPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
    marginTop: 2,
  },
  reorderBtn: {
    backgroundColor: '#4338ca',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reorderBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
  },
});
