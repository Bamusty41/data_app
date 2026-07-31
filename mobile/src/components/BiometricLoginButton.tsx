import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppStore } from '../state/store';

/**
 * BiometricLoginButton – triggers device biometric auth and, on success,
 * fetches stored JWT token from SecureStore and updates the global store.
 */
export const BiometricLoginButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const setToken = useAppStore((state) => state.setToken);

  const handlePress = async () => {
    setLoading(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        alert('Biometric authentication not available on this device');
        return;
      }
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        alert('No biometric records enrolled');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Biometrics',
        fallbackLabel: 'Enter Passcode',
      });
      if (result.success) {
        const SecureStore = await import('expo-secure-store');
        const token = await SecureStore.default.getItemAsync('accessToken');
        if (token) {
          setToken(token);
        } else {
          alert('No saved session – please log in with email/password first');
        }
      } else {
        alert('Biometric authentication failed');
      }
    } catch (e: any) {
      console.error('Biometric login error', e);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Login with Biometrics</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
