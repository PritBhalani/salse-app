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
import { mobileAPI, setAuthToken } from '../config/api';

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
      Alert.alert('Error', 'Please enter your registered mobile number and password');
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
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check credentials.';
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
        <Text style={styles.title}>SALASE WHOLESALE</Text>
        <Text style={styles.subtitle}>Plumbing & Bathware Field App</Text>

        {/* Quick Role Fill Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, selectedRole === 'SALESMAN' && styles.tabButtonActive]}
            onPress={() => handleQuickFill('SALESMAN')}
          >
            <Text
              style={[styles.tabText, selectedRole === 'SALESMAN' && styles.tabTextActive]}
            >
              Salesman Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedRole === 'SHOP_OWNER' && styles.tabButtonActive]}
            onPress={() => handleQuickFill('SHOP_OWNER')}
          >
            <Text
              style={[styles.tabText, selectedRole === 'SHOP_OWNER' && styles.tabTextActive]}
            >
              Shop Owner Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registered Phone Number</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile"
            placeholderTextColor="#94a3b8"
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
            placeholderTextColor="#94a3b8"
          />
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In to Account</Text>
          )}
        </TouchableOpacity>

        {selectedRole === 'SHOP_OWNER' && (
          <Text style={styles.helperNote}>
            * Shop owners receive their login ID & password from their visiting salesman during registration.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#0284c7',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
  },
  loginButton: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  helperNote: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
  },
});
