import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const TodayBeatScreen = ({ user, onSelectShop, onOpenRegisterShop, onLogout }) => {
  const [allRoutes, setAllRoutes] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Simulated salesman current coordinates (Morbi market: 22.8125, 70.8355)
  const currentSalesmanCoords = {
    latitude: 22.8125,
    longitude: 70.8355,
  };

  const fetchRouteAndShops = async () => {
    setLoading(true);
    try {
      const res = await mobileAPI.get('/routes/my-route');
      if (res.data.success) {
        setAllRoutes(res.data.routes || []);
        setRouteData(res.data.route);
        if (res.data.route && !selectedRouteId) {
          setSelectedRouteId(res.data.route._id);
        }
        // Fetch shops with distance calculated
        const shopRes = await mobileAPI.get(
          `/shops?salesmanLat=${currentSalesmanCoords.latitude}&salesmanLng=${currentSalesmanCoords.longitude}`
        );
        if (shopRes.data.success) {
          setShops(shopRes.data.shops || []);
        }
      }
    } catch (err) {
      console.error('Error fetching beat route:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteAndShops();
  }, []);

  const handleSwitchBeat = (r) => {
    setRouteData(r);
    setSelectedRouteId(r ? r._id : 'ALL');
  };

  // Filter shops based on selected route cities or search
  const activeRoute = allRoutes.find((r) => r._id === selectedRouteId) || routeData;
  const baseShops = activeRoute && selectedRouteId !== 'ALL' && !searchQuery
    ? shops.filter((s) => activeRoute.cities?.some((c) => c.toLowerCase() === s.city?.toLowerCase()))
    : shops;

  const filteredShops = searchQuery
    ? shops.filter((s) =>
        s.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone?.includes(searchQuery) ||
        s.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : baseShops;

  const handleOpenMap = (shop) => {
    const lat = shop.location?.latitude;
    const lng = shop.location?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open map navigation'));
    } else {
      Alert.alert('Notice', 'No GPS coordinates pinned for this shop.');
    }
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot make call'));
  };

  const handleWhatsApp = (shop) => {
    const cleanPhone = shop.phone?.replace(/[^0-9]/g, '');
    const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = `*SHIVAM MARKETING - WHOLESALE ORDER INQUIRY*\nNamaste ${shop.ownerName || ''} ji,\nThis is ${user?.name || 'your Sales Executive'} from Shivam Marketing.\nChecking in for today's wholesale order requirements for ${shop.shopName}.`;
    Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
  };

  const handleCheckIn = async (shop) => {
    setCheckInLoading(shop._id);
    try {
      const res = await mobileAPI.post('/visits/check-in', {
        shopId: shop._id,
        latitude: currentSalesmanCoords.latitude,
        longitude: currentSalesmanCoords.longitude,
        isMockLocationDetected: false,
        purpose: 'ORDER_AND_COLLECTION',
        notes: 'In-person beat check-in',
      });

      if (res.data.success) {
        const v = res.data.verification;
        if (v.isGeofenceVerified) {
          Alert.alert(
            'Visit Verified! ✅',
            `You are ${v.distanceMeters}m from ${shop.shopName}.\nGeofence check passed. You can now punch orders and collect payment.`
          );
        } else {
          Alert.alert(
            'Outside Geofence Warning ⚠️',
            `You are ${v.distanceMeters}m away from the shop (Allowed: ${v.thresholdMeters}m).\nThis visit will be flagged for Admin review.`
          );
        }
        await fetchRouteAndShops();
      }
    } catch (err) {
      Alert.alert('Check-in Error', err.response?.data?.message || 'Failed to verify visit');
    } finally {
      setCheckInLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Status & Salesman Header */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={styles.userRow}>
            <Text style={styles.salesmanGreeting}>Namaste, {user?.name?.split(' ')[0] || 'Sales Executive'}</Text>
            <View style={styles.liveGpsBadge}>
              <Text style={styles.liveGpsText}>🟢 GPS Live (12m)</Text>
            </View>
          </View>
          <View style={styles.cashRow}>
            <Text style={styles.cashBadgeLabel}>Cash in Hand:</Text>
            <Text style={styles.cashValue}>₹{user?.cashInHand?.toLocaleString() || 0}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Multi-Beat Switcher (If salesman is assigned 2+ beats) */}
        {allRoutes.length > 1 && (
          <View style={styles.beatSwitcherContainer}>
            <Text style={styles.sectionTitle}>🎯 Select Active Beat Route:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.beatSwitcherScroll}>
              {allRoutes.map((r) => {
                const isSelected = selectedRouteId === r._id;
                return (
                  <TouchableOpacity
                    key={r._id}
                    style={[styles.beatPill, isSelected && styles.beatPillActive]}
                    onPress={() => handleSwitchBeat(r)}
                  >
                    <Text style={[styles.beatPillText, isSelected && styles.beatPillTextActive]}>
                      📍 {r.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.beatPill, selectedRouteId === 'ALL' && styles.beatPillActive]}
                onPress={() => handleSwitchBeat(null)}
              >
                <Text style={[styles.beatPillText, selectedRouteId === 'ALL' && styles.beatPillTextActive]}>
                  🌐 All ({shops.length} Shops)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Current Beat Info Card */}
        <View style={styles.routeCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.routeTitle}>
              {selectedRouteId === 'ALL' ? '🌐 All Assigned Territory' : routeData ? routeData.name : 'Today Beat'}
            </Text>
            <View style={styles.shopCountBadge}>
              <Text style={styles.shopCountText}>{filteredShops.length} Shops</Text>
            </View>
          </View>
          <Text style={styles.routeMeta}>
            Coverage Cities: {routeData?.cities?.join(', ') || 'Morbi, Wankaner, Rajkot'}
          </Text>
        </View>

        {/* Quick Search & Filter Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="🔍 Search shop name, owner, phone number..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Action Bar: Register New Shop */}
        <TouchableOpacity style={styles.registerShopBtn} onPress={onOpenRegisterShop}>
          <Text style={styles.registerShopBtnText}>➕ Onboard New Retail Shop in Field</Text>
        </TouchableOpacity>

        {/* Retail Shops List */}
        <Text style={styles.sectionHeader}>
          {searchQuery ? `Search Results (${filteredShops.length})` : 'Shops on Route:'}
        </Text>

        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 30 }} />
        ) : filteredShops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyText}>No retail shops found matching your search.</Text>
          </View>
        ) : (
          filteredShops.map((s, index) => {
            const distance = s.distanceMeters !== undefined ? s.distanceMeters : 45;
            const isInsideGeofence = distance <= 250;
            const totalDue = (s.gstBalance || 0) + (s.nonGstBalance || 0);

            return (
              <View key={s._id} style={styles.shopCard}>
                {/* Header with Distance Badge */}
                <View style={styles.shopCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.shopIndex}>#{index + 1}</Text>
                      <Text style={styles.shopName} numberOfLines={1}>
                        {s.shopName}
                      </Text>
                    </View>
                    <Text style={styles.ownerText}>
                      👤 {s.ownerName || 'Proprietor'} • 📞 {s.phone}
                    </Text>
                    <Text style={styles.addressText} numberOfLines={1}>
                      📍 {s.address || 'Main Market'}, {s.city || 'Morbi'}
                    </Text>
                  </View>

                  {/* Geofence Distance Pill */}
                  <View style={[styles.distancePill, isInsideGeofence ? styles.distanceInside : styles.distanceOutside]}>
                    <Text style={[styles.distancePillText, isInsideGeofence ? styles.textInside : styles.textOutside]}>
                      {distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance}m`}
                    </Text>
                    <Text style={styles.geofenceLabel}>
                      {isInsideGeofence ? '✓ Geofence OK' : '⚠️ Off-Site'}
                    </Text>
                  </View>
                </View>

                {/* Ledger Balance Pill */}
                <View style={styles.ledgerRow}>
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>GST Due:</Text>
                    <Text style={styles.ledgerGst}>₹{s.gstBalance?.toLocaleString() || 0}</Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>Rough Cash Due:</Text>
                    <Text style={styles.ledgerNonGst}>₹{s.nonGstBalance?.toLocaleString() || 0}</Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>Total Due:</Text>
                    <Text style={styles.ledgerTotal}>₹{totalDue.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Quick Action Icons: Call, WhatsApp, Navigation */}
                <View style={styles.quickContactRow}>
                  <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleCall(s.phone)}>
                    <Text style={styles.quickContactText}>📞 Call Owner</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleWhatsApp(s)}>
                    <Text style={styles.quickContactText}>📲 WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickContactBtn} onPress={() => handleOpenMap(s)}>
                    <Text style={styles.quickContactText}>🗺️ Maps Nav</Text>
                  </TouchableOpacity>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.actionButtonRow}>
                  <TouchableOpacity
                    style={styles.checkInBtn}
                    onPress={() => handleCheckIn(s)}
                    disabled={checkInLoading === s._id}
                  >
                    {checkInLoading === s._id ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.checkInBtnText}>📍 GPS Check-In</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => onSelectShop(s)}
                  >
                    <Text style={styles.detailBtnText}>Open Shop &rarr;</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
  topBar: {
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salesmanGreeting: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  liveGpsBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveGpsText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cashBadgeLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cashValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34d399',
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
  beatSwitcherContainer: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  beatSwitcherScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  beatPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  beatPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  beatPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  beatPillTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  routeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  shopCountBadge: {
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shopCountText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  routeMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  registerShopBtn: {
    backgroundColor: '#065f46',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  registerShopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 10,
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
  shopCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  shopIndex: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  shopName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ownerText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
  addressText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  distancePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  distanceInside: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
  },
  distanceOutside: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  distancePillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textInside: {
    color: '#34d399',
  },
  textOutside: {
    color: '#f87171',
  },
  geofenceLabel: {
    fontSize: 8,
    color: '#cbd5e1',
    marginTop: 1,
  },
  ledgerRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ledgerItem: {
    flex: 1,
    alignItems: 'center',
  },
  ledgerDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  ledgerLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  ledgerGst: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34d399',
  },
  ledgerNonGst: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  ledgerTotal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f87171',
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  quickContactBtn: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickContactText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkInBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  checkInBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    alignItems: 'center',
  },
  detailBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
