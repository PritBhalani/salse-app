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
  const [city, setCity] = useState('Morbi');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Pinned location
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
        city,
        address,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        gstNumber,
        ownerPassword: ownerPassword || undefined,
      });

      if (res.data.success) {
        setCreatedCredentials(res.data.credentials);
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
    const text = encodeURIComponent(
      `*Salase Plumbing & Bathware Wholesale*\n\nNamaste ${ownerName} ji,\nYour shop *${shopName}* is now registered on our digital portal.\n\n*Your App Login Credentials:*\n📱 *User ID (Phone):* ${createdCredentials.phone}\n🔑 *Password:* ${createdCredentials.password}\n\nYou can log in to view pending bills, live delivery dispatch status, and browse bathware fittings.`
    );
    Linking.openURL(`https://wa.me/91${phone}?text=${text}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Onboard New Retail Shop</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {createdCredentials ? (
          <View style={styles.successCard}>
            <Text style={styles.successBadge}>✅ Registration Complete</Text>
            <Text style={styles.successTitle}>Share Login Credentials with Owner</Text>
            <Text style={styles.successSubtitle}>
              The shop owner cannot register themselves. Give them these login credentials:
            </Text>

            <View style={styles.credentialsBox}>
              <Text style={styles.credRow}>
                <Text style={styles.credLabel}>User Phone ID: </Text>
                <Text style={styles.credValue}>{createdCredentials.phone}</Text>
              </Text>
              <Text style={styles.credRow}>
                <Text style={styles.credLabel}>Login Password: </Text>
                <Text style={styles.credValue}>{createdCredentials.password}</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp}>
              <Text style={styles.whatsappBtnText}>📲 Share Credentials via WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneBtn} onPress={onRegisterSuccess}>
              <Text style={styles.doneBtnText}>Return to Beat &rarr;</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* GPS Pin Badge */}
            <View style={styles.gpsCard}>
              <Text style={styles.gpsIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsTitle}>Shop Location Pinned Automatically</Text>
                <Text style={styles.gpsCoords}>
                  Lat: {currentCoords.latitude.toFixed(4)}, Lng: {currentCoords.longitude.toFixed(4)}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop / Firm Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Radhe Sanitary Mart"
                placeholderTextColor="#64748b"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner / Proprietor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sanjaybhai"
                placeholderTextColor="#64748b"
                value={ownerName}
                onChangeText={setOwnerName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner Phone (Becomes App Login ID) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="10-digit mobile number"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="Morbi / Wankaner / Rajkot"
                placeholderTextColor="#64748b"
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Address & Landmark *</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Full address"
                placeholderTextColor="#64748b"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GSTIN Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="24XXXXX0000X1ZX"
                placeholderTextColor="#64748b"
                value={gstNumber}
                onChangeText={setGstNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Set Initial Password (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Default: last 6 digits of phone"
                placeholderTextColor="#64748b"
                value={ownerPassword}
                onChangeText={setOwnerPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Enrol Shop & Generate ID/Password &rarr;</Text>
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
    marginRight: 10,
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  gpsIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  gpsCoords: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  successBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  credentialsBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  credRow: {
    fontSize: 13,
    marginBottom: 6,
  },
  credLabel: {
    color: '#94a3b8',
  },
  credValue: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  whatsappBtn: {
    width: '100%',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  doneBtn: {
    paddingVertical: 10,
  },
  doneBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
});
