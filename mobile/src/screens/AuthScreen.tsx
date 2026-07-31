import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../state/store';
import { BiometricLoginButton } from '../components/BiometricLoginButton';
import { useNavigation } from '@react-navigation/native';

/**
 * AuthScreen – email/password login with Tailwind styling via NativeWind.
 * On success the JWT token is saved to SecureStore and the global store is updated.
 */
export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAppStore((s) => s.setToken);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing credentials', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');
      const token = data.accessToken;
      await SecureStore.setItemAsync('accessToken', token);
      setToken(token);
      navigation.navigate('Dashboard' as never);
    } catch (err: any) {
      Alert.alert('Login error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center p-5 bg-gray-50" accessibilityLabel="Authentication screen">
      <Text className="text-3xl font-bold text-center mb-8 text-gray-800">Welcome Back</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        className="bg-white border border-gray-300 rounded-md px-4 py-3 mb-4 text-gray-800"
        accessibilityLabel="Email input"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="bg-white border border-gray-300 rounded-md px-4 py-3 mb-6 text-gray-800"
        accessibilityLabel="Password input"
      />
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        className="bg-indigo-600 rounded-md py-3 flex items-center justify-center mb-4 disabled:opacity-50"
        accessibilityLabel="Login button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-lg">Login</Text>
        )}
      </TouchableOpacity>
      <BiometricLoginButton />
    </View>
  );
};
