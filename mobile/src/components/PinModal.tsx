import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppStore } from '../state/store';
import { ScrollView } from 'react-native-gesture-handler';

/**
 * PinModal – a numeric keypad modal for entering a 4‑digit transaction PIN.
 * Props:
 *   visible   – whether modal is shown
 *   onSuccess – called with entered PIN when correct (validation done by caller)
 *   onCancel  – called when user dismisses modal
 */
interface PinModalProps {
  visible: boolean;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ visible, onConfirm, onCancel }) => {
  const [pin, setPin] = useState('');

  const handlePress = (digit: string) => {
    if (pin.length < 4) setPin((prev) => prev + digit);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (pin.length === 4) {
      onConfirm(pin);
      setPin('');
    }
  };

  const renderKey = (label: string, onPress: () => void) => (
    <TouchableOpacity style={styles.key} onPress={onPress} key={label}>
      <Text style={styles.keyText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container} accessible accessibilityLabel="Transaction PIN entry modal">
          <Text style={styles.title}>Enter your 4‑digit PIN</Text>
          <View style={styles.pinDisplay} accessible accessibilityLabel={`PIN entered ${pin.length} of 4`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, pin[i] ? styles.filledDot : null]}
                accessible
                accessibilityLabel={pin[i] ? 'filled' : 'empty'}
              />
            ))}
          </View>
          <View style={styles.keypad}>
            {[...'1234567890'].map((d) => renderKey(d, () => handlePress(d))]}
            {renderKey('⌫', handleDelete)}
            {renderKey('✔', handleSubmit)}
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} accessible accessibilityLabel="Cancel PIN entry">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  pinDisplay: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#888',
    marginHorizontal: 8,
  },
  filledDot: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: '30%',
    padding: 12,
    margin: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignItems: 'center',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 12,
  },
  cancelText: {
    color: '#d00',
    fontWeight: '600',
  },
});
