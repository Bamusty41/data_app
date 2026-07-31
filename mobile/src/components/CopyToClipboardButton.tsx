import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * Reusable copy‑to‑clipboard button.
 * Props:
 *   value – string to copy
 *   label – accessible label (optional)
 */
interface CopyButtonProps {
  value: string;
  label?: string;
}

export const CopyToClipboardButton: React.FC<CopyButtonProps> = ({ value, label }) => {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${value} copied to clipboard`);
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handleCopy} accessibilityLabel={label ?? 'Copy to clipboard'}>
      <MaterialIcons name="content-copy" size={20} color="#2563eb" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    padding: 4,
    marginLeft: 6,
  },
});
