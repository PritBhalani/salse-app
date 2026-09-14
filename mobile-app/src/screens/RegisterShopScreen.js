import React, { useState } from 'react';
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

export const RegisterShopScreen = ({ onBack, onRegisterSuccess }) => {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [city, setCity] = useState('Morbi');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('150000');
  const [ownerPassword, setOwnerPassword] = useState('shop123');
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Simulated GPS Coordinates
  const currentCoords = {
    latitude: 22.8130,
    longitude: 70.8360,
  };

  const handleRegister = async () => {
    if (!shopName || !ownerName || !phone || !address) {
      Alert.alert('Required Fields', 'Please fill in Shop Name, Owner Name, Phone, and Address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await mobileAPI.post('/shops', {
        shopName,
        ownerName,
        phone,
        altPhone: altPhone || undefined,
        city,
        address,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        gstNumber: gstNumber || undefined,
        creditLimit: parseFloat(creditLimit) || 150000,
        ownerPassword: ownerPassword || 'shop123',
      });

      if (res.data.success) {
        setCreatedCredentials(res.data.credentials || {
          phone,
          password: ownerPassword || 'shop123',
          shopName,
          ownerName,
        });
        Alert.alert(
          'Shop Enrolled! 🎉',
          `Shop registered. Credentials created for ${ownerName}.`
        );
      }
    } catch (err) {
      Alert.alert('Enrollment Error', err.response?.data?.message || 'Could not register shop');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!createdCredentials) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const recipient = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = `*SHIVAM MARKETING - DIGITAL PORTAL ONBOARDING*\n------------------------------\nNamaste ${ownerName} ji,\nYour retail firm *${shopName}* is now registered on the Shivam Wholesale digital portal.\n\n📱 *Your Mobile Login User ID:* ${createdCredentials.phone}\n🔑 *Your Mobile Login Password:* ${createdCredentials.password}\n\n*App Features Available for You:*\n✓ 🛍️ Browse full visual catalog & 1-click restock\n✓ 🚚 Live delivery dispatch tracking\n✓ 📑 Statement & GST tax ledgers\n------------------------------\nWelcome aboard!`;
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
          <Text style={styles.headerTitle}>Onboard New Retail Shop</Text>
          <Text style={styles.headerSubtitle}>Field Geofence & B2B Account Setup</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {createdCredentials ? (
          <View style={styles.successCard}>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>✓ Registration Complete</Text>
            </View>

            <Text style={styles.successTitle}>Share Mobile Login ID with Retailer</Text>
            <Text style={styles.successSubtitle}>
              The shop owner cannot self-register. Hand over or WhatsApp these generated credentials:
            </Text>

            <View style={styles.credentialsBox}>
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>User Phone ID:</Text>
                <Text style={styles.credValue}>{createdCredentials.phone}</Text>
              </View>
              <View style={styles.credDivider} />
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Login Password:</Text>
                <Text style={styles.credValue}>{createdCredentials.password}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp}>
              <Text style={styles.whatsappBtnText}>📲 Share Credentials on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneBtn} onPress={onRegisterSuccess}>
              <Text style={styles.doneBtnText}>Return to Beat &rarr;</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* GPS Geofence Pin Card */}
            <View style={styles.gpsCard}>
              <Text style={styles.gpsIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsTitle}>Shop Location Pinned Automatically</Text>
                <Text style={styles.gpsCoords}>
                  Lat: {currentCoords.latitude.toFixed(4)}, Lng: {currentCoords.longitude.toFixed(4)} (Morbi Market)
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop / Firm Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Radhe Sanitary & Hardware"
                placeholderTextColor="#64748b"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner / Proprietor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sanjaybhai Patel"
                placeholderTextColor="#64748b"
                value={ownerName}
                onChangeText={setOwnerName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner Phone Number (Becomes App Login User ID) *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alternate Phone / Counter Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 98980XXXXX"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={altPhone}
                onChangeText={setAltPhone}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City / Beat Area *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Morbi"
                  placeholderTextColor="#64748b"
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Credit Limit (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="150000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Detailed Shop Address / Landmark *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Shop 12, Sardar Patel Market, Sanala Road"
                placeholderTextColor="#64748b"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GSTIN Number (Optional - Leave blank for Rough/Cash)</Text>
              <TextInput
                style={styles.input}
                placeholder="24AAAAA0000A1Z5"
                placeholderTextColor="#64748b"
                value={gstNumber}
                onChangeText={setGstNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Set Retailer App Password</Text>
              <TextInput
                style={styles.input}
                placeholder="shop123"
                placeholderTextColor="#64748b"
                value={ownerPassword}
                onChangeText={setOwnerPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Enrol Shop & Generate Credentials &rarr;</Text>
              )}
            </TouchableOpacity>
          </>
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
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    minHeight: 56,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
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
    fontSize: 11,
    color: '#38bdf8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c4a6e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0284c7',
    gap: 10,
  },
  gpsIcon: {
    fontSize: 22,
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  gpsCoords: {
    fontSize: 10,
    color: '#a5b4fc',
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  successCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  successBadge: {
    backgroundColor: '#064e3b',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  successBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  credentialsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  credLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  credValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  credDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 8,
  },
  whatsappBtn: {
    backgroundColor: '#15803d',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  doneBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  doneBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
