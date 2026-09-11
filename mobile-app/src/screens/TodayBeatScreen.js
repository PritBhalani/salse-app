import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { mobileAPI } from '../config/api';

export const TodayBeatScreen = ({ user, onSelectShop, onOpenRegisterShop, onLogout }) => {
  const [routeData, setRouteData] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(null);

  // Simulated salesman current coordinates (Morbi main market: 22.8125, 70.8355)
  const currentSalesmanCoords = {
    latitude: 22.8125,
    longitude: 70.8355,
  };

  const fetchRouteAndShops = async () => {
    setLoading(true);
    try {
      const res = await mobileAPI.get('/routes/my-route');
      if (res.data.success) {
        setRouteData(res.data.route);
        // Also fetch shops with distance calculated
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

  const handleOpenMap = (shop) => {
    const lat = shop.location?.latitude;
    const lng = shop.location?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch((err) => Alert.alert('Error', 'Could not open map navigation'));
    } else {
      Alert.alert('Notice', 'No GPS coordinates pinned for this shop.');
    }
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
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.salesmanGreeting}>Namaste, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.cashBadge}>
            Cash in Hand: <Text style={styles.cashValue}>₹{user?.cashInHand?.toLocaleString() || 0}</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Today's Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>
              {routeData?.name || 'Assigned Multi-City Beat'}
            </Text>
            <View style={styles.cityBadge}>
              <Text style={styles.cityBadgeText}>
                {routeData?.cities?.join(' + ') || 'Morbi + Wankaner'}
              </Text>
            </View>
          </View>
          <Text style={styles.routeSubtitle}>
            {routeData?.description || 'Plumbing, brassware & sanitaryware retail distribution'}
          </Text>
          <View style={styles.routeFooter}>
            <Text style={styles.routeMeta}>Total Shops: {shops.length}</Text>
            <Text style={styles.routeMeta}>
              Date:{' '}
              {routeData?.nextVisitDate
                ? new Date(routeData.nextVisitDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Today'}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shops on Today's Beat</Text>
          <Text style={styles.sectionSubtitle}>Sorted by proximity to your GPS</Text>
        </View>

        {/* Shops List */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 40 }} />
        ) : (
          shops.map((shop) => {
            const isNear = (shop.distanceMeters ?? 9999) <= 150;
            const totalDue = (shop.gstBalance || 0) + (shop.nonGstBalance || 0);

            return (
              <View key={shop._id} style={styles.shopCard}>
                {/* Shop Title Row */}
                <View style={styles.shopHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{shop.shopName}</Text>
                    <Text style={styles.ownerName}>Prop: {shop.ownerName}</Text>
                  </View>
                  <View style={styles.cityTag}>
                    <Text style={styles.cityTagText}>{shop.city}</Text>
                  </View>
                </View>

                {/* Distance & GPS Proximity Badge */}
                <View style={styles.distanceRow}>
                  <View
                    style={[
                      styles.distanceBadge,
                      isNear ? styles.distanceBadgeNear : styles.distanceBadgeFar,
                    ]}
                  >
                    <Text
                      style={[
                        styles.distanceBadgeText,
                        isNear ? styles.distanceBadgeTextNear : styles.distanceBadgeTextFar,
                      ]}
                    >
                      {shop.distanceMeters !== null
                        ? `📍 ${shop.distanceMeters}m away ${isNear ? '(At Shop)' : ''}`
                        : '📍 Location pinned'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => handleOpenMap(shop)}
                  >
                    <Text style={styles.navButtonText}>🗺️ Open Map</Text>
                  </TouchableOpacity>
                </View>

                {/* Dual Ledger Balance Box */}
                <View style={styles.balanceBox}>
                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceLabel}>GST Due</Text>
                    <Text style={styles.balanceGst}>₹{shop.gstBalance?.toLocaleString() || 0}</Text>
                  </View>
                  <View style={styles.balanceDivider} />
                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceLabel}>Rough Due</Text>
                    <Text style={styles.balanceNonGst}>
                      ₹{shop.nonGstBalance?.toLocaleString() || 0}
                    </Text>
                  </View>
                  <View style={styles.balanceDivider} />
                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceLabel}>Total Due</Text>
                    <Text style={styles.balanceTotal}>₹{totalDue.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {/* Anti-fraud Check-In Button */}
                  <TouchableOpacity
                    style={[styles.checkInBtn, isNear ? styles.checkInBtnActive : styles.checkInBtnWarning]}
                    onPress={() => handleCheckIn(shop)}
                    disabled={checkInLoading === shop._id}
                  >
                    {checkInLoading === shop._id ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.checkInBtnText}>
                        {isNear ? '✅ GPS Check-In' : '📍 Verify Visit'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Open Shop 360 View */}
                  <TouchableOpacity
                    style={styles.openShopBtn}
                    onPress={() => onSelectShop(shop)}
                  >
                    <Text style={styles.openShopBtnText}>Orders & Ledger &rarr;</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Register Shop Button */}
      <TouchableOpacity style={styles.floatingBtn} onPress={onOpenRegisterShop}>
        <Text style={styles.floatingBtnText}>+ Onboard New Shop</Text>
      </TouchableOpacity>
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
  salesmanGreeting: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cashBadge: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  cashValue: {
    color: '#34d399',
    fontWeight: 'bold',
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
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  routeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
  },
  cityBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cityBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  routeSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
  },
  routeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  routeMeta: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  shopCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  ownerName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  cityTag: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cityTagText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceBadgeNear: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  distanceBadgeFar: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  distanceBadgeTextNear: {
    color: '#34d399',
  },
  distanceBadgeTextFar: {
    color: '#fbbf24',
  },
  navButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  navButtonText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  balanceBox: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  balanceCol: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  balanceNonGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  balanceTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  balanceDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkInBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInBtnActive: {
    backgroundColor: '#059669',
  },
  checkInBtnWarning: {
    backgroundColor: '#d97706',
  },
  checkInBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  openShopBtn: {
    flex: 1.2,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openShopBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  floatingBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
