import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../state/authStore';
import { BiometricLogin } from '../components/BiometricLogin';

export function LoginScreen() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    })();
  }, []);

  const markSignedIn = async () => {
    await SecureStore.setItemAsync('strowallet_token', 'secure-demo-token', {
      keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY,
    });
    setAuthenticated(true);
  };

  const handleLogin = async () => {
    await markSignedIn();
  };

  return (
    <View className="flex-1 bg-slate-950 px-6 py-10">
      <Text className="text-4xl font-bold text-white">Welcome Back</Text>
      <Text className="text-slate-300 mt-4 text-base leading-7">Securely manage your wallet, buy airtime, and confirm transactions with Face ID or PIN.</Text>

      <View className="mt-10 space-y-4">
        <TouchableOpacity onPress={handleLogin} className="rounded-3xl bg-indigo-600 px-5 py-4 items-center">
          <Text className="text-white text-lg font-semibold">Continue with Passcode</Text>
        </TouchableOpacity>

        {biometricAvailable ? <BiometricLogin onSuccess={markSignedIn} /> : null}
      </View>

      <View className="mt-auto items-center">
        <Text className="text-slate-400 text-sm">Strowallet keeps your access token safely in SecureStore.</Text>
      </View>
    </View>
  );
}
