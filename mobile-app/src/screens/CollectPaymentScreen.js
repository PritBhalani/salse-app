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
  const [collectionChannel, setCollectionChannel] = useState('IN_PERSON_BEAT'); // 'IN_PERSON_BEAT' | 'PHONE_COLLECTION'
  const [billType, setBillType] = useState('NON_GST'); // 'NON_GST' | 'GST'
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH'); // 'CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const gstDue = shop.gstBalance || 0;
  const nonGstDue = shop.nonGstBalance || 0;
  const totalDue = gstDue + nonGstDue;

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
      const isRemote = collectionChannel === 'PHONE_COLLECTION';
      const res = await mobileAPI.post('/payments', {
        shopId: shop._id,
        billType,
        amount: parsedAmount,
        mode,
        collectionChannel,
        isWithoutVisit: isRemote,
        chequeNumber: mode === 'CHEQUE' ? chequeNumber : undefined,
        chequeBank: mode === 'CHEQUE' ? chequeBank : undefined,
        notes: notes || (isRemote ? 'Remote collection via phone' : undefined),
      });

      if (res.data.success) {
        const rcpNum = res.data.payment?.receiptNumber || 'RCP-NEW';
        Alert.alert(
          'Payment Recorded! 💵',
          `Receipt ${rcpNum} generated for ₹${parsedAmount.toLocaleString()}.\n${isRemote ? '📞 Remote payment' : '📍 Beat payment'} credited to ${billType === 'GST' ? 'GST Official Ledger' : 'Rough Cash Ledger'}.`,
          [
            {
              text: 'Share WhatsApp Receipt 📲',
              onPress: () => {
                const msg = `*SHIVAM MARKETING - PAYMENT RECEIPT*\n------------------------------\n🏪 *Shop:* ${shop.shopName}\n🧾 *Receipt No:* ${rcpNum}\n📑 *Ledger Book:* ${billType === 'GST' ? 'GST Official Ledger' : 'Rough Cash Ledger'}\n💵 *Amount Received:* ₹${parsedAmount.toLocaleString()}\n💳 *Mode:* ${mode}\n📍 *Channel:* ${isRemote ? '📞 Remote Phone Collection' : '📍 In-Person Beat Visit'}\n✅ *Status:* RECEIVED & CREDITED\n------------------------------\nThank you for your timely wholesale payment!`;
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
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            💳 Collect Wholesale Payment
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {shop.shopName} • {shop.city || 'Morbi'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Collection Channel Switcher (Simulator Style) */}
        <View style={styles.channelCard}>
          <Text style={styles.sectionLabel}>Collection Channel:</Text>
          <View style={styles.channelRow}>
            <TouchableOpacity
              style={[
                styles.channelBtn,
                collectionChannel === 'IN_PERSON_BEAT' && styles.channelBtnActiveBeat,
              ]}
              onPress={() => setCollectionChannel('IN_PERSON_BEAT')}
            >
              <Text
                style={[
                  styles.channelBtnText,
                  collectionChannel === 'IN_PERSON_BEAT' && styles.channelBtnTextActive,
                ]}
              >
                📍 In-Person Beat Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.channelBtn,
                collectionChannel === 'PHONE_COLLECTION' && styles.channelBtnActivePhone,
              ]}
              onPress={() => setCollectionChannel('PHONE_COLLECTION')}
            >
              <Text
                style={[
                  styles.channelBtnText,
                  collectionChannel === 'PHONE_COLLECTION' && styles.channelBtnTextActive,
                ]}
              >
                📞 Remote Payment (No Visit)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3-Column Dual Balance Matrix Card */}
        <View style={styles.duesCard}>
          <View style={styles.duesHeaderRow}>
            <Text style={styles.duesHeaderTitle}>Account Statement & Current Balances</Text>
            <View style={styles.ledgerBadge}>
              <Text style={styles.ledgerBadgeText}>DUAL LEDGER</Text>
            </View>
          </View>

          <View style={styles.matrixBox}>
            <View style={styles.matrixCol}>
              <Text style={styles.matrixLabel}>GST Book Due</Text>
              <Text style={styles.matrixGst}>₹{gstDue.toLocaleString()}</Text>
            </View>
            <View style={styles.matrixDivider} />
            <View style={styles.matrixCol}>
              <Text style={styles.matrixLabel}>Rough Cash Due</Text>
              <Text style={styles.matrixRough}>₹{nonGstDue.toLocaleString()}</Text>
            </View>
            <View style={styles.matrixDivider} />
            <View style={styles.matrixCol}>
              <Text style={styles.matrixLabel}>Total Due</Text>
              <Text style={styles.matrixTotal}>₹{totalDue.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Target Ledger Book Selector */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Select Target Ledger Book:</Text>
          <View style={styles.targetBookRow}>
            <TouchableOpacity
              style={[
                styles.targetBookBtn,
                billType === 'NON_GST' && styles.targetBookBtnActiveNonGst,
              ]}
              onPress={() => setBillType('NON_GST')}
            >
              <Text
                style={[
                  styles.targetBookTitle,
                  billType === 'NON_GST' && styles.targetBookTitleActive,
                ]}
              >
                💵 Rough / Cash Ledger
              </Text>
              <Text
                style={[
                  styles.targetBookDue,
                  billType === 'NON_GST' && styles.targetBookDueActive,
                ]}
              >
                Due: ₹{nonGstDue.toLocaleString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.targetBookBtn,
                billType === 'GST' && styles.targetBookBtnActiveGst,
              ]}
              onPress={() => setBillType('GST')}
            >
              <Text
                style={[
                  styles.targetBookTitle,
                  billType === 'GST' && styles.targetBookTitleActive,
                ]}
              >
                🏛️ GST Tax Invoice
              </Text>
              <Text
                style={[
                  styles.targetBookDue,
                  billType === 'GST' && styles.targetBookDueActive,
                ]}
              >
                Due: ₹{gstDue.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Amount Input + Quick Fill Presets */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Payment Amount Collected (₹) *</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Preset Fill Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
            {totalDue > 0 && (
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => {
                  setAmount(totalDue.toString());
                }}
              >
                <Text style={styles.presetChipText}>Full Due (₹{totalDue.toLocaleString()})</Text>
              </TouchableOpacity>
            )}
            {nonGstDue > 0 && (
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => {
                  setBillType('NON_GST');
                  setAmount(nonGstDue.toString());
                }}
              >
                <Text style={styles.presetChipText}>Rough (₹{nonGstDue.toLocaleString()})</Text>
              </TouchableOpacity>
            )}
            {gstDue > 0 && (
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => {
                  setBillType('GST');
                  setAmount(gstDue.toString());
                }}
              >
                <Text style={styles.presetChipText}>GST (₹{gstDue.toLocaleString()})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setAmount('10000')}
            >
              <Text style={styles.presetChipText}>₹10,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setAmount('25000')}
            >
              <Text style={styles.presetChipText}>₹25,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setAmount('50000')}
            >
              <Text style={styles.presetChipText}>₹50,000</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Payment Mode Selector */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Payment Mode *</Text>
          <View style={styles.modeGrid}>
            {[
              { id: 'CASH', label: '💵 Cash', desc: 'Direct Hand Cash' },
              { id: 'UPI', label: '📱 UPI / QR', desc: 'GPay / PhonePe / QR' },
              { id: 'CHEQUE', label: '📝 Cheque', desc: 'Bank Cheque deposit' },
              { id: 'BANK_TRANSFER', label: '🏦 Bank NEFT', desc: 'Direct RTGS / NEFT' },
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

        {/* Notes / Remarks */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Collection Notes / Remarks:</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Received from owner against Bill #2026-004..."
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
            <Text style={styles.submitBtnText}>
              Record {collectionChannel === 'PHONE_COLLECTION' ? 'Remote' : 'Beat'} Payment & Generate Receipt &rarr;
            </Text>
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
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Channel Switcher */
  channelCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  channelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  channelBtnActiveBeat: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderColor: '#10b981',
  },
  channelBtnActivePhone: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#a855f7',
  },
  channelBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  channelBtnTextActive: {
    color: '#ffffff',
  },

  /* Outstanding Dues Matrix Card */
  duesCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  duesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  duesHeaderTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  ledgerBadge: {
    backgroundColor: '#020617',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ledgerBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  matrixBox: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  matrixCol: {
    flex: 1,
    alignItems: 'center',
  },
  matrixDivider: {
    width: 1,
    backgroundColor: '#1e293b',
  },
  matrixLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  matrixGst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
  },
  matrixRough: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  matrixTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f87171',
  },

  /* Target Book Row */
  formSection: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  targetBookRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetBookBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  targetBookBtnActiveNonGst: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  targetBookBtnActiveGst: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  targetBookTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  targetBookTitleActive: {
    color: '#ffffff',
  },
  targetBookDue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
  },
  targetBookDueActive: {
    color: '#38bdf8',
  },

  /* Amount Input */
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34d399',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34d399',
  },

  /* Presets Scroll */
  presetsScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 6,
  },
  presetChipText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },

  /* Mode Grid */
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeCard: {
    width: '48.5%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modeCardActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderColor: '#0284c7',
  },
  modeLabel: {
    fontSize: 12,
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

  /* Cheque Section */
  chequeSection: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  chequeSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 8,
  },
  chequeInput: {
    backgroundColor: '#020617',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },

  /* Notes */
  notesInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    color: '#f8fafc',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },

  /* Submit Button */
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
