import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ImageZoomModal = ({ visible, photo, onClose }) => {
  if (!photo) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Header with Title and Close Button */}
              <View style={styles.header}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {photo.name || 'Product Photo'}
                  </Text>
                  {photo.brand ? (
                    <Text style={styles.brandSubtitle}>
                      Brand: <Text style={styles.brandHighlight}>{photo.brand}</Text>
                      {photo.price ? `  •  ₹${photo.price}` : ''}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Large Image View */}
              <View style={styles.imageBox}>
                <Image
                  source={{ uri: photo.url }}
                  style={styles.largeImage}
                  resizeMode="contain"
                />
              </View>

              {/* Dismiss Bar */}
              <TouchableOpacity style={styles.tapHint} onPress={onClose}>
                <Text style={styles.tapHintText}>Tap anywhere outside or ✕ to close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: SCREEN_WIDTH - 32,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  brandHighlight: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageBox: {
    width: '100%',
    height: Math.min(SCREEN_WIDTH - 32, 380),
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  largeImage: {
    width: '100%',
    height: '100%',
  },
  tapHint: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  tapHintText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
});
