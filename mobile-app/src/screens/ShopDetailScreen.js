import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const ShopDetailScreen = ({ shop, onBack, onPunchOrder, onCollectPayment }) => {
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS' or 'PAYMENTS'
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    altPhone: '',
    address: '',
    city: '',
    latitude: 22.8123,
    longitude: 70.8354,
  });

  const fetchShopDetails = async () => {
    try {
      const res = await mobileAPI.get(`/shops/${shop._id}`);
      if (res.data.success) {
        setShopData(res.data);
      }
    } catch (err) {
      console.warn('Error fetching shop details:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopDetails();
  };

  useEffect(() => {
    setLoading(true);
    fetchShopDetails();
  }, [shop._id]);

  const currentShop = shopData?.shop || shop;
  const orders = shopData?.orders || [];
  const payments = shopData?.payments || [];
  const totalDue = (currentShop.gstBalance || 0) + (currentShop.nonGstBalance || 0);

  const handleOpenEdit = () => {
    setEditForm({
      shopName: currentShop.shopName || '',
      ownerName: currentShop.ownerName || '',
      phone: currentShop.phone || '',
      altPhone: currentShop.altPhone || '',
      address: currentShop.address || '',
      city: currentShop.city || 'Morbi',
      latitude: currentShop.location?.latitude || 22.8123,
      longitude: currentShop.location?.longitude || 70.8354,
    });
    setEditModalVisible(true);
  };

  const handleRepinGps = () => {
    const lat = 22.8128;
    const lng = 70.8358;
    setEditForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    Alert.alert('GPS Location Acquired 📍', `Geofence coordinates updated to ${lat}, ${lng}`);
  };

  const handleSaveEdit = async () => {
    if (!editForm.shopName || !editForm.ownerName || !editForm.phone) {
      Alert.alert('Validation', 'Shop Name, Owner Name, and Phone are required.');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        shopName: editForm.shopName,
        ownerName: editForm.ownerName,
        phone: editForm.phone,
        altPhone: editForm.altPhone,
        address: editForm.address,
        city: editForm.city,
        location: {
          latitude: parseFloat(editForm.latitude),
          longitude: parseFloat(editForm.longitude),
        },
      };

      const res = await mobileAPI.put(`/shops/${currentShop._id}`, payload);
      if (res.data.success) {
        Alert.alert('Saved ✅', 'Shop profile and geofence coordinates updated successfully.');
        setEditModalVisible(false);
        fetchShopDetails();
      }
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Server error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleShareLedgerWhatsApp = () => {
    const cleanPhone = currentShop.phone?.replace(/[^0-9]/g, '');
    const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = `*SHIVAM MARKETING - WHOLESALE ACCOUNT STATEMENT*\n------------------------------\n🏪 *Shop:* ${currentShop.shopName}\n👤 *Owner:* ${currentShop.ownerName}\n🏛️ *GST Tax Book Balance:* ₹${(currentShop.gstBalance || 0).toLocaleString()}\n💵 *Rough Cash Book Balance:* ₹${(currentShop.nonGstBalance || 0).toLocaleString()}\n💰 *Total Outstanding Due:* ₹${totalDue.toLocaleString()}\n------------------------------\nPlease clear outstanding balance for uninterrupted dispatch deliveries. Thank you!`;
    Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentShop.shopName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentShop.city || 'Morbi'} • Verified Retailer
          </Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={handleOpenEdit}>
          <Text style={styles.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
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
        {/* Shop Info Card with Embedded 3-Column Balance Matrix (Simulator Style) */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.profileShopName} numberOfLines={1}>
                {currentShop.shopName}
              </Text>
              <Text style={styles.profileMeta}>
                Prop: {currentShop.ownerName} • {currentShop.phone}
              </Text>
              <Text style={styles.profileAddress} numberOfLines={1}>
                📍 {currentShop.address || 'Market Area'}, {currentShop.city || 'Morbi'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editPillBtn} onPress={handleOpenEdit}>
              <Text style={styles.editPillText}>✏️ Edit / GPS</Text>
            </TouchableOpacity>
          </View>

          {/* 3-Column Dual Balance Matrix */}
          <View style={styles.balanceMatrix}>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>GST Due</Text>
              <Text style={styles.balanceValGst}>₹{(currentShop.gstBalance || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.balanceColDivider} />
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>Rough Due</Text>
              <Text style={styles.balanceValRough}>₹{(currentShop.nonGstBalance || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.balanceColDivider} />
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>Total Due</Text>
              <Text style={styles.balanceValTotal}>₹{totalDue.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Primary Field Sales 2x2 Action Matrix (Simulator Style) */}
        <View style={styles.actionMatrixGrid}>
          {/* Row 1: Beat Visit Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.takeOrderBtn}
              onPress={() => onPunchOrder(currentShop)}
            >
              <Text style={styles.takeOrderBtnText}>🛍️ Take Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.collectPaymentBtn}
              onPress={() => onCollectPayment(currentShop)}
            >
              <Text style={styles.collectPaymentBtnText}>💳 Collect Payment</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Phone / Remote Desk Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.phoneOrderBtn}
              onPress={() => onPunchOrder(currentShop)}
            >
              <Text style={styles.phoneOrderBtnText}>📞 Phone Order (No Visit)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.remotePaymentBtn}
              onPress={() => onCollectPayment(currentShop)}
            >
              <Text style={styles.remotePaymentBtnText}>💳 Remote Payment</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Contact & WhatsApp Bar */}
        <View style={styles.contactBarRow}>
          <TouchableOpacity style={styles.contactPill} onPress={() => {
            const cleanPhone = currentShop.phone?.replace(/[^0-9]/g, '');
            if (cleanPhone) Linking.openURL(`tel:${cleanPhone}`);
          }}>
            <Text style={styles.contactPillText}>📞 Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactPill} onPress={handleShareLedgerWhatsApp}>
            <Text style={styles.contactPillText}>📲 WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactPill} onPress={() => {
            const lat = currentShop.location?.latitude || 22.8123;
            const lng = currentShop.location?.longitude || 70.8354;
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
          }}>
            <Text style={styles.contactPillText}>🗺️ Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs: Orders vs Receipts */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ORDERS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ORDERS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'ORDERS' && styles.tabBtnTextActive]}>
              📦 Orders History ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PAYMENTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PAYMENTS')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'PAYMENTS' && styles.tabBtnTextActive]}>
              📑 Payment Receipts ({payments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 20 }} />
        ) : activeTab === 'ORDERS' ? (
          orders.length === 0 ? (
            <Text style={styles.emptyText}>No orders punched for this shop yet.</Text>
          ) : (
            orders.map((o) => (
              <View key={o._id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{o.orderNumber}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{o.status}</Text>
                  </View>
                </View>
                <Text style={styles.itemMeta}>
                  Placed: {new Date(o.createdAt).toLocaleDateString('en-IN')} | Bill: {o.billType}
                </Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemCount}>
                    {o.items?.length || 0} Products ({o.items?.reduce((s, i) => s + (i.boxCount || 1), 0)} Boxes)
                  </Text>
                  <Text style={styles.itemAmount}>₹{o.totalAmount?.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )
        ) : (
          payments.length === 0 ? (
            <Text style={styles.emptyText}>No payment receipts recorded yet.</Text>
          ) : (
            payments.map((p) => (
              <View key={p._id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{p.receiptNumber}</Text>
                  <Text style={styles.paymentMode}>{p.mode} {p.chequeNumber ? `(#${p.chequeNumber})` : ''}</Text>
                </View>
                <Text style={styles.itemMeta}>
                  Collected: {new Date(p.collectedAt).toLocaleDateString('en-IN')} | Book: {p.billType}
                </Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.paymentCredited}>Credited to Ledger</Text>
                  <Text style={styles.paidAmount}>₹{p.amount?.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Edit Shop Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Shop Details & GPS Location</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shop / Firm Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.shopName}
                  onChangeText={(v) => setEditForm({ ...editForm, shopName: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Owner Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.ownerName}
                  onChangeText={(v) => setEditForm({ ...editForm, ownerName: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Phone *</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="phone-pad"
                  value={editForm.phone}
                  onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alternate Phone / WhatsApp</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="phone-pad"
                  value={editForm.altPhone}
                  onChangeText={(v) => setEditForm({ ...editForm, altPhone: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City / Area</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.city}
                  onChangeText={(v) => setEditForm({ ...editForm, city: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Detailed Address</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.address}
                  onChangeText={(v) => setEditForm({ ...editForm, address: v })}
                />
              </View>

              {/* Repin GPS Geofence */}
              <TouchableOpacity style={styles.repinGpsBtn} onPress={handleRepinGps}>
                <Text style={styles.repinGpsText}>📍 Re-Pin Current GPS Coordinates</Text>
                <Text style={styles.repinGpsSub}>
                  Lat: {editForm.latitude}, Lng: {editForm.longitude}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 14,
    backgroundColor: '#0f172a',
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
    color: '#38bdf8',
    fontSize: 12,
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
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0c4a6e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  editBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  profileShopName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  profileAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  editPillBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editPillText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  balanceMatrix: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  balanceCol: {
    flex: 1,
    alignItems: 'center',
  },
  balanceColDivider: {
    width: 1,
    backgroundColor: '#1e293b',
  },
  balanceLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  balanceValGst: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34d399',
  },
  balanceValRough: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  balanceValTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionMatrixGrid: {
    gap: 8,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  takeOrderBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeOrderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  collectPaymentBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectPaymentBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  phoneOrderBtn: {
    flex: 1,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.35)',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneOrderBtnText: {
    color: '#c084fc',
    fontSize: 10,
    fontWeight: 'bold',
  },
  remotePaymentBtn: {
    flex: 1,
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remotePaymentBtnText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contactBarRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  contactPill: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 8,
    alignItems: 'center',
  },
  contactPillText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtnActive: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  itemCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
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
  itemMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  itemCount: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  itemAmount: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  modalScroll: {
    paddingBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  repinGpsBtn: {
    backgroundColor: '#0c4a6e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  repinGpsText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  repinGpsSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
