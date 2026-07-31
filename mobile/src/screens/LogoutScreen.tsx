import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../state/store';
import { useNavigation } from '@react-navigation/native';

/**
 * LogoutScreen – clears SecureStore token, resets Zustand auth slice, and navigates to Auth.
 */
export const LogoutScreen: React.FC = () => {
  const clearAuth = useAppStore((s) => s.clearAuth);
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      clearAuth();
      navigation.navigate('Auth' as never);
    } catch (err: any) {
      console.error('Logout error', err);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <View style={styles.container} accessible accessibilityLabel="Logout screen">
      <Text style={styles.title}>Are you sure you want to log out?</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout} accessibilityLabel="Confirm logout">
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 20, marginBottom: 20 },
  button: { backgroundColor: '#dc2626', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
