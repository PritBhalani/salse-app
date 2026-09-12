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
  const [mode, setMode] = useState('CASH'); // 'CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER'
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalDue = (shop.gstBalance || 0) + (shop.nonGstBalance || 0);

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
          `Receipt ${rcpNum} generated for ₹${parsedAmount.toLocaleString()}. Ledger credited.`,
          [
            {
              text: 'Share WhatsApp Receipt 📲',
              onPress: () => {
                const msg = `*SHIVAM MARKETING - PAYMENT RECEIPT*\n------------------------------\n🏪 *Shop:* ${shop.shopName}\n🧾 *Receipt No:* ${rcpNum}\n📑 *Ledger Book:* ${billType === 'GST' ? 'GST Official Ledger' : 'Rough Cash Ledger'}\n💵 *Amount Received:* ₹${parsedAmount.toLocaleString()}\n💳 *Mode:* ${mode}\n✅ *Status:* RECEIVED & CREDITED\n------------------------------\nThank you for your timely wholesale payment!`;
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
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            💵 Collect Payment
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {shop.shopName} • {shop.city || 'Morbi'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Outstanding Dues Card */}
        <View style={styles.duesCard}>
          <Text style={styles.duesHeaderTitle}>Account Statement & Current Balances</Text>
          <View style={styles.duesRow}>
            <View style={styles.dueCol}>
              <Text style={styles.dueLabel}>GST Book Due</Text>
              <Text style={styles.dueGst}>₹{(shop.gstBalance || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.dueDivider} />
            <View style={styles.dueCol}>
              <Text style={styles.dueLabel}>Rough Cash Due</Text>
              <Text style={styles.dueNonGst}>₹{(shop.nonGstBalance || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.dueDivider} />
            <View style={styles.dueCol}>
              <Text style={styles.dueLabel}>Total Outstanding</Text>
              <Text style={styles.dueTotal}>₹{totalDue.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Book Selection: Rough Cash vs GST Tax */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Which Ledger Book are you crediting?</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pillBtn, billType === 'NON_GST' && styles.pillBtnActiveNonGst]}
              onPress={() => setBillType('NON_GST')}
            >
              <Text style={[styles.pillBtnText, billType === 'NON_GST' && styles.pillBtnTextActive]}>
                💵 Rough / Cash Ledger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, billType === 'GST' && styles.pillBtnActiveGst]}
              onPress={() => setBillType('GST')}
            >
              <Text style={[styles.pillBtnText, billType === 'GST' && styles.pillBtnTextActive]}>
                🏛️ GST Tax Invoice Book
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Amount Input */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Payment Amount Collected (₹) *</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Payment Mode Selector */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Payment Mode *</Text>
          <View style={styles.modeGrid}>
            {[
              { id: 'CASH', label: '💵 Cash', desc: 'Direct Hand Cash' },
              { id: 'UPI', label: '📱 UPI / QR', desc: 'GPay / PhonePe / Paytm' },
              { id: 'CHEQUE', label: '📝 Cheque', desc: 'Bank Cheque deposit' },
              { id: 'BANK_TRANSFER', label: '🏦 NEFT / RTGS', desc: 'Direct Bank transfer' },
            ].map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeCard, mode === m.id && styles.modeCardActive]}
                onPress={() => setMode(m.id)}
              >
                <Text style={[styles.modeLabel, mode === m.id && styles.modeLabelActive]}>
                  {m.label}
                </Text>
                <Text style={styles.modeDesc}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cheque Details (if Cheque selected) */}
        {mode === 'CHEQUE' && (
          <View style={styles.chequeSection}>
            <Text style={styles.chequeSectionTitle}>Cheque Details</Text>
            <TextInput
              style={styles.chequeInput}
              placeholder="Cheque Number (e.g. 048291)"
              placeholderTextColor="#64748b"
              value={chequeNumber}
              onChangeText={setChequeNumber}
            />
            <TextInput
              style={[styles.chequeInput, { marginTop: 8 }]}
              placeholder="Bank Name & Branch (e.g. HDFC Morbi Main Branch)"
              placeholderTextColor="#64748b"
              value={chequeBank}
              onChangeText={setChequeBank}
            />
          </View>
        )}

        {/* Notes / Remark */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Collection Notes / Remarks:</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Received from Sanjaybhai against Bill #2026-004..."
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
    paddingBottom: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
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
  duesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  duesHeaderTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  duesRow: {
    flexDirection: 'row',
  },
  dueCol: {
    flex: 1,
    alignItems: 'center',
  },
  dueDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  dueLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  dueGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  dueNonGst: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  dueTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f87171',
  },
  formSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34d399',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34d399',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeCardActive: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 2,
  },
  modeLabelActive: {
    color: '#38bdf8',
  },
  modeDesc: {
    fontSize: 10,
    color: '#64748b',
  },
  chequeSection: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  chequeSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 10,
  },
  chequeInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
