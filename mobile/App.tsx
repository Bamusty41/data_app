import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAuthStore } from './src/state/authStore';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  useEffect(() => {
    const restoreSession = async () => {
      const token = await SecureStore.getItemAsync('strowallet_token');
      if (token) {
        setAuthenticated(true);
      }
      setIsReady(true);
    };

    restoreSession();
  }, [setAuthenticated]);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="mt-4 text-slate-200">Restoring secure session...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
