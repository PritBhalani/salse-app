import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const ShopDetailScreen = ({ shop, onBack, onPunchOrder, onCollectPayment }) => {
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS' or 'PAYMENTS'

  const fetchShopDetails = async () => {
    setLoading(true);
    try {
      const res = await mobileAPI.get(`/shops/${shop._id}`);
      if (res.data.success) {
        setShopData(res.data);
      }
    } catch (err) {
      console.error('Error fetching shop details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopDetails();
  }, [shop._id]);

  const currentShop = shopData?.shop || shop;
  const orders = shopData?.orders || [];
  const payments = shopData?.payments || [];
  const totalDue = (currentShop.gstBalance || 0) + (currentShop.nonGstBalance || 0);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentShop.shopName}
        </Text>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${currentShop.phone}`)}
        >
          <Text style={styles.callBtnText}>📞 Call</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Shop Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.shopTitle}>{currentShop.shopName}</Text>
          <Text style={styles.ownerText}>Proprietor: {currentShop.ownerName}</Text>
          <Text style={styles.addressText}>
            📍 {currentShop.address}, {currentShop.city}
          </Text>
          {currentShop.gstNumber && (
            <Text style={styles.gstText}>GSTIN: {currentShop.gstNumber}</Text>
          )}

          {/* Dual Ledger Balance Box */}
          <View style={styles.ledgerBox}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerLabel}>GST Book Due</Text>
              <Text style={styles.ledgerGst}>₹{currentShop.gstBalance?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.ledgerDivider} />
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerLabel}>Rough / Cash Due</Text>
              <Text style={styles.ledgerNonGst}>
                ₹{currentShop.nonGstBalance?.toLocaleString() || 0}
              </Text>
            </View>
            <View style={styles.ledgerDivider} />
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerLabel}>Total Due</Text>
              <Text style={styles.ledgerTotal}>₹{totalDue.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons: Punch Order & Collect Payment */}
        <View style={styles.primaryActions}>
          <TouchableOpacity
            style={styles.actionBtnOrder}
            onPress={() => onPunchOrder(currentShop)}
          >
            <Text style={styles.actionBtnText}>📝 Take New Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnPayment}
            onPress={() => onCollectPayment(currentShop)}
          >
            <Text style={styles.actionBtnText}>💵 Collect Payment</Text>
          </TouchableOpacity>
        </View>

        {/* History Tabs (Orders vs Receipts) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ORDERS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ORDERS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'ORDERS' && styles.tabBtnTextActive]}>
              Bill History ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PAYMENTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PAYMENTS')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'PAYMENTS' && styles.tabBtnTextActive]}
            >
              Payment Receipts ({payments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* List of items */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 20 }} />
        ) : activeTab === 'ORDERS' ? (
          orders.length === 0 ? (
            <Text style={styles.emptyText}>No orders punched for this shop yet.</Text>
          ) : (
            orders.map((order) => (
              <View key={order._id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyNumber}>{order.orderNumber}</Text>
                  <View
                    style={[
                      styles.tagBadge,
                      order.billType === 'GST' ? styles.tagGst : styles.tagNonGst,
                    ]}
                  >
                    <Text style={styles.tagText}>{order.billType}</Text>
                  </View>
                </View>

                <View style={styles.historyRow}>
                  <Text style={styles.historyMeta}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN')} | Status:{' '}
                    <Text style={styles.statusText}>{order.status}</Text>
                  </Text>
                  <Text style={styles.historyAmount}>₹{order.totalAmount.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )
        ) : payments.length === 0 ? (
          <Text style={styles.emptyText}>No payment collections logged yet.</Text>
        ) : (
          payments.map((p) => (
            <View key={p._id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyNumber}>{p.receiptNumber}</Text>
                <View style={styles.tagMode}>
                  <Text style={styles.tagModeText}>
                    {p.mode} {p.chequeNumber ? `(#${p.chequeNumber})` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.historyRow}>
                <Text style={styles.historyMeta}>
                  {new Date(p.collectedAt).toLocaleDateString('en-IN')} | Book: {p.billType}
                </Text>
                <Text style={styles.historyPaidAmount}>₹{p.amount.toLocaleString()}</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginHorizontal: 10,
    textAlign: 'center',
  },
  callBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0369a1',
    borderRadius: 8,
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  shopTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  ownerText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  gstText: {
    fontSize: 11,
    color: '#38bdf8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  ledgerBox: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ledgerCol: {
    alignItems: 'center',
  },
  ledgerLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 3,
  },
  ledgerGst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  ledgerNonGst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  ledgerTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ledgerDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtnOrder: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnPayment: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyNumber: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 13,
    color: '#ffffff',
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagGst: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  tagNonGst: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tagMode: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagModeText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statusText: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  historyPaidAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});
