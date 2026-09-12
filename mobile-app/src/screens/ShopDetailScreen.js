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
  Linking,
  Alert,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const ShopDetailScreen = ({ shop, onBack, onPunchOrder, onCollectPayment }) => {
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
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
    // Current mobile coords
    const lat = 22.8128;
    const lng = 70.8358;
    setEditForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    Alert.alert('GPS Location Acquired 📍', `Geofence coordinates set to ${lat}, ${lng}`);
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
        setEditModalVisible(false);
        Alert.alert('Success ✅', 'Shop details and GPS coordinates updated successfully!');
        await fetchShopDetails();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update shop details');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleShareStatementWhatsApp = () => {
    const cleanPhone = currentShop.phone?.replace(/[^0-9]/g, '');
    const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = `*SHIVAM MARKETING - ACCOUNT STATEMENT*\n------------------------------\n🏪 *Shop:* ${currentShop.shopName}\n👤 *Owner:* ${currentShop.ownerName}\n\n📊 *Current Outstanding Balance:*\n• GST Tax Book: ₹${(currentShop.gstBalance || 0).toLocaleString()}\n• Rough / Cash Book: ₹${(currentShop.nonGstBalance || 0).toLocaleString()}\n💰 *Total Due:* ₹${totalDue.toLocaleString()}\n------------------------------\nPlease keep payment ready for our salesman visit.\nThank you!`;
    Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
  };

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
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={styles.editBtn} onPress={handleOpenEdit}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${currentShop.phone}`)}
          >
            <Text style={styles.callBtnText}>📞 Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Shop Info Card */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopTitle}>{currentShop.shopName}</Text>
              <Text style={styles.ownerText}>Proprietor: {currentShop.ownerName}</Text>
              <Text style={styles.addressText}>
                📍 {currentShop.address}, {currentShop.city}
              </Text>
              {currentShop.gstNumber ? (
                <Text style={styles.gstText}>GSTIN: {currentShop.gstNumber}</Text>
              ) : null}
            </View>
          </View>

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

          {/* 1-Tap WhatsApp Statement Sharing Button */}
          <TouchableOpacity
            style={styles.whatsappShareBtn}
            onPress={handleShareStatementWhatsApp}
          >
            <Text style={styles.whatsappShareBtnText}>📲 Send Statement via WhatsApp</Text>
          </TouchableOpacity>
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
                  <Text style={styles.historyAmount}>₹{order.totalAmount?.toLocaleString()}</Text>
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
                <Text style={styles.historyPaidAmount}>₹{p.amount?.toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Shop & GPS Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Shop Details & GPS</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Shop Name *</Text>
              <TextInput
                style={styles.input}
                value={editForm.shopName}
                onChangeText={(text) => setEditForm({ ...editForm, shopName: text })}
              />

              <Text style={styles.inputLabel}>Owner / Contact Name *</Text>
              <TextInput
                style={styles.input}
                value={editForm.ownerName}
                onChangeText={(text) => setEditForm({ ...editForm, ownerName: text })}
              />

              <Text style={styles.inputLabel}>Primary Phone *</Text>
              <TextInput
                style={styles.input}
                value={editForm.phone}
                keyboardType="phone-pad"
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              />

              <Text style={styles.inputLabel}>Alternate Phone</Text>
              <TextInput
                style={styles.input}
                value={editForm.altPhone}
                keyboardType="phone-pad"
                onChangeText={(text) => setEditForm({ ...editForm, altPhone: text })}
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={editForm.address}
                onChangeText={(text) => setEditForm({ ...editForm, address: text })}
              />

              {/* GPS Geofence Re-Pin Section */}
              <View style={styles.gpsBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.gpsTitle}>📍 GPS Geofence Pin</Text>
                  <TouchableOpacity style={styles.gpsPinBtn} onPress={handleRepinGps}>
                    <Text style={styles.gpsPinBtnText}>Pin My Location</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.gpsCoords}>
                  Lat: {editForm.latitude} | Lng: {editForm.longitude}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Updates</Text>
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
    marginHorizontal: 8,
    textAlign: 'center',
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0284c7',
    borderRadius: 8,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  callBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#059669',
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
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  gstText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginTop: 2,
  },
  ledgerBox: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ledgerCol: {
    flex: 1,
    alignItems: 'center',
  },
  ledgerDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  ledgerLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  ledgerGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  ledgerNonGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  ledgerTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  whatsappShareBtn: {
    marginTop: 12,
    backgroundColor: '#065f46',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
  },
  whatsappShareBtnText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtnOrder: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  actionBtnPayment: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBtnTextActive: {
    color: '#38bdf8',
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagGst: {
    backgroundColor: '#064e3b',
  },
  tagNonGst: {
    backgroundColor: '#78350f',
  },
  tagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tagMode: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagModeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#a5b4fc',
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
    color: '#38bdf8',
  },
  historyPaidAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  inputLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    marginTop: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  gpsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0284c7',
    marginTop: 12,
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  gpsPinBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpsPinBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gpsCoords: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
