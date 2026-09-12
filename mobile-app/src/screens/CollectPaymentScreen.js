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

export const CollectPaymentScreen = ({ shop, onBack, onPaymentSuccess }) => {
  const [billType, setBillType] = useState('NON_GST');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH'); // 'CASH', 'CHEQUE', 'UPI'
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRecordPayment = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount in ₹.');
      return;
    }

    if (mode === 'CHEQUE' && (!chequeNumber || !chequeBank)) {
      Alert.alert('Cheque Details', 'Please provide Cheque Number and Bank Name.');
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
        notes,
      });

      if (res.data.success) {
        const rcpNum = res.data.payment?.receiptNumber || 'RCP-NEW';
        Alert.alert(
          'Payment Recorded! 💵',
          `Receipt ${rcpNum} generated for ₹${parsedAmount.toLocaleString()}.`,
          [
            {
              text: 'Share WhatsApp Receipt 📲',
              onPress: () => {
                const msg = `*SHIVAM MARKETING - PAYMENT RECEIPT*\n------------------------------\n🏪 *Shop:* ${shop.shopName}\n🧾 *Receipt No:* ${rcpNum}\n📑 *Ledger Book:* ${billType === 'GST' ? 'GST Official Ledger' : 'Rough Cash Ledger'}\n💵 *Amount Received:* ₹${parsedAmount.toLocaleString()}\n💳 *Mode:* ${mode}\n✅ *Status:* RECEIVED & CREDITED\n------------------------------\nThank you for your timely payment!`;
                const cleanPhone = shop.phone?.replace(/[^0-9]/g, '');
                const recipient = cleanPhone?.length === 10 ? '91' + cleanPhone : cleanPhone;
                Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`);
                onPaymentSuccess();
              },
            },
            {
              text: 'Done',
              onPress: () => onPaymentSuccess(),
            },
          ]
        );
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
                GST Tax Invoice Book
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Payment Amount (₹) *</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Payment Mode Selector */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Payment Mode *</Text>
          <View style={styles.modeRow}>
            {['CASH', 'CHEQUE', 'UPI'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'CASH' ? '💵 Cash' : m === 'CHEQUE' ? '🏦 Cheque' : '📱 UPI'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cheque Details (Conditional) */}
        {mode === 'CHEQUE' && (
          <View style={styles.chequeSection}>
            <Text style={styles.sectionLabel}>Cheque Details *</Text>
            <TextInput
              style={styles.input}
              placeholder="Cheque Number (e.g. 048291)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={chequeNumber}
              onChangeText={setChequeNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Bank Name (e.g. HDFC Bank, Morbi)"
              placeholderTextColor="#64748b"
              value={chequeBank}
              onChangeText={setChequeBank}
            />
          </View>
        )}

        {/* Notes */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Collection Remarks (Optional):</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Paid in full for last month deliveries..."
            placeholderTextColor="#64748b"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleRecordPayment}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Record Payment & Generate Receipt &rarr;</Text>
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
    fontSize: 12,
    color: '#38bdf8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  duesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  duesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 10,
    textTransform: 'uppercase',
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
    color: '#64748b',
    marginBottom: 2,
  },
  dueValueGst: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
  },
  dueValueNonGst: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  formSection: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillBtnActiveNonGst: {
    backgroundColor: '#78350f',
    borderColor: '#f59e0b',
  },
  pillBtnActiveGst: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  pillBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillBtnTextActive: {
    color: '#ffffff',
  },
  amountInput: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    color: '#34d399',
    fontSize: 24,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  modeBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  chequeSection: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
