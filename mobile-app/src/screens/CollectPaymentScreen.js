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
} from 'react-native';
import { mobileAPI } from '../config/api';

export const CollectPaymentScreen = ({ shop, onBack, onPaymentSuccess }) => {
  const [billType, setBillType] = useState(
    (shop.nonGstBalance || 0) > 0 ? 'NON_GST' : 'GST'
  );
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH'); // 'CASH', 'CHEQUE', 'UPI'
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeDue = billType === 'GST' ? (shop.gstBalance || 0) : (shop.nonGstBalance || 0);

  const handleFillFullDue = () => {
    setAmount(activeDue.toString());
  };

  const handleRecordPayment = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment collection amount.');
      return;
    }

    if (mode === 'CHEQUE' && (!chequeNumber || !chequeBank)) {
      Alert.alert('Cheque Details Required', 'Please enter the cheque number and bank name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await mobileAPI.post('/payments', {
        shopId: shop._id,
        billType,
        amount: parsedAmount,
        mode,
        chequeNumber: mode === 'CHEQUE' ? chequeNumber : undefined,
        chequeBank: mode === 'CHEQUE' ? chequeBank : undefined,
        upiTransactionId: mode === 'UPI' ? upiRef : undefined,
        notes,
      });

      if (res.data.success) {
        Alert.alert(
          'Payment Recorded Successfully! ✅',
          `Receipt ${res.data.payment.receiptNumber} generated for ₹${parsedAmount.toLocaleString()}.\nShop ${billType} balance updated.\n${
            mode === 'CASH'
              ? 'Cash added to your digital wallet for warehouse handover.'
              : ''
          }`
        );
        onPaymentSuccess();
      }
    } catch (err) {
      Alert.alert('Payment Error', err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Collect Payment
          </Text>
          <Text style={styles.headerSubtitle}>{shop.shopName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Outstanding Dues Summary */}
        <View style={styles.duesCard}>
          <Text style={styles.duesTitle}>Current Shop Dues</Text>
          <View style={styles.duesRow}>
            <View style={styles.dueItem}>
              <Text style={styles.dueLabel}>GST Book Due:</Text>
              <Text style={styles.dueValueGst}>₹{shop.gstBalance?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.dueItem}>
              <Text style={styles.dueLabel}>Rough / Cash Due:</Text>
              <Text style={styles.dueValueNonGst}>₹{shop.nonGstBalance?.toLocaleString() || 0}</Text>
            </View>
          </View>
        </View>

        {/* Book Selector (GST vs Non-GST) */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Which Book Are You Collecting For?</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pillBtn, billType === 'NON_GST' && styles.pillBtnActiveNonGst]}
              onPress={() => setBillType('NON_GST')}
            >
              <Text style={[styles.pillBtnText, billType === 'NON_GST' && styles.pillBtnTextActive]}>
                Rough / Non-GST Book
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, billType === 'GST' && styles.pillBtnActiveGst]}
              onPress={() => setBillType('GST')}
            >
              <Text style={[styles.pillBtnText, billType === 'GST' && styles.pillBtnTextActive]}>
                GST Tax Book
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.formSection}>
          <View style={styles.amountLabelRow}>
            <Text style={styles.sectionLabel}>Collection Amount (₹):</Text>
            {activeDue > 0 && (
              <TouchableOpacity onPress={handleFillFullDue}>
                <Text style={styles.fillDueText}>Fill Full Due (₹{activeDue.toLocaleString()})</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            placeholder="e.g. 15000"
            placeholderTextColor="#64748b"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Payment Mode Selector */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Payment Mode:</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'CASH' && styles.modeBtnActive]}
              onPress={() => setMode('CASH')}
            >
              <Text style={[styles.modeBtnText, mode === 'CASH' && styles.modeBtnTextActive]}>
                💵 Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, mode === 'CHEQUE' && styles.modeBtnActive]}
              onPress={() => setMode('CHEQUE')}
            >
              <Text style={[styles.modeBtnText, mode === 'CHEQUE' && styles.modeBtnTextActive]}>
                🏦 Cheque
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, mode === 'UPI' && styles.modeBtnActive]}
              onPress={() => setMode('UPI')}
            >
              <Text style={[styles.modeBtnText, mode === 'UPI' && styles.modeBtnTextActive]}>
                📱 UPI
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Conditional Cheque Details */}
        {mode === 'CHEQUE' && (
          <View style={styles.chequeDetailsBox}>
            <Text style={styles.chequeTitle}>Cheque Information</Text>
            <TextInput
              style={styles.chequeInput}
              placeholder="Cheque Number (6 digits)"
              placeholderTextColor="#64748b"
              value={chequeNumber}
              onChangeText={setChequeNumber}
            />
            <TextInput
              style={styles.chequeInput}
              placeholder="Bank Name (e.g. HDFC / SBI)"
              placeholderTextColor="#64748b"
              value={chequeBank}
              onChangeText={setChequeBank}
            />
          </View>
        )}

        {/* Conditional UPI Details */}
        {mode === 'UPI' && (
          <View style={styles.chequeDetailsBox}>
            <Text style={styles.chequeTitle}>UPI Transaction Reference</Text>
            <TextInput
              style={styles.chequeInput}
              placeholder="UPI UTR / Reference ID"
              placeholderTextColor="#64748b"
              value={upiRef}
              onChangeText={setUpiRef}
            />
          </View>
        )}

        {/* Remarks / Notes */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Notes / Remarks (Optional):</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Balance promise next Monday"
            placeholderTextColor="#64748b"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleRecordPayment}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Record Payment & Issue Receipt &rarr;</Text>
          )}
        </TouchableOpacity>
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
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  scrollContent: {
    padding: 16,
  },
  duesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  duesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  duesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dueItem: {
    flex: 1,
  },
  dueLabel: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  dueValueGst: {
    fontSize: 16,
    fontWeight: 'extrabold',
    color: '#34d399',
    marginTop: 2,
  },
  dueValueNonGst: {
    fontSize: 16,
    fontWeight: 'extrabold',
    color: '#fbbf24',
    marginTop: 2,
  },
  formSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fillDueText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillBtnActiveNonGst: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  pillBtnActiveGst: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  pillBtnTextActive: {
    color: '#ffffff',
  },
  amountInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: 'extrabold',
    color: '#34d399',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  chequeDetailsBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chequeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 8,
  },
  chequeInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#ffffff',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
