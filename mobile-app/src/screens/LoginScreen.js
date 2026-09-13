import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { mobileAPI, setAuthToken, setDeviceId } from '../config/api';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('9898033333'); // Default Ramesh Salesman
  const [password, setPassword] = useState('sales123');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('SALESMAN');

  const handleQuickFill = (role) => {
    setSelectedRole(role);
    if (role === 'SALESMAN') {
      setPhone('9898033333');
      setPassword('sales123');
    } else {
      setPhone('9898055555');
      setPassword('shop123');
    }
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Required Fields', 'Please enter your registered phone number and password');
      return;
    }

    setLoading(true);
    try {
      const res = await mobileAPI.post('/auth/login', {
        phone,
        password,
        deviceId: 'DEVICE_ANDROID_SM_G998B',
      });

      if (res.data.success) {
        setAuthToken(res.data.token);
        if (res.data.user?.deviceId) {
          setDeviceId(res.data.user.deviceId);
        } else {
          setDeviceId('DEVICE_ANDROID_SM_G998B');
        }
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      Alert.alert('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>🚿</Text>
        </View>
        <Text style={styles.title}>SHIVAM WHOLESALE</Text>
        <Text style={styles.subtitle}>Plumbing & Bathware ERP Field App</Text>

        {/* Quick Role Fill Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, selectedRole === 'SALESMAN' && styles.tabButtonActive]}
            onPress={() => handleQuickFill('SALESMAN')}
          >
            <Text style={[styles.tabText, selectedRole === 'SALESMAN' && styles.tabTextActive]}>
              Salesman
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedRole === 'SHOP_OWNER' && styles.tabButtonActive]}
            onPress={() => handleQuickFill('SHOP_OWNER')}
          >
            <Text style={[styles.tabText, selectedRole === 'SHOP_OWNER' && styles.tabTextActive]}>
              Shop Owner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registered Phone Number</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#64748b"
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>
              Sign In as {selectedRole === 'SALESMAN' ? 'Salesman' : 'Shop Owner'} &rarr;
            </Text>
          )}
        </TouchableOpacity>

        {selectedRole === 'SHOP_OWNER' ? (
          <Text style={styles.helperNote}>
            * Shop owners receive their User ID & Password directly from their visiting salesman during onboard registration.
          </Text>
        ) : (
          <Text style={styles.helperNote}>
            * Salesman credentials are created and managed by the Admin from the CRM portal.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0c4a6e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  logoIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#38bdf8',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  helperNote: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 14,
  },
});
