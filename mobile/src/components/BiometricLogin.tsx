import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricLoginProps {
  onSuccess: () => void;
}

export function BiometricLogin({ onSuccess }: BiometricLoginProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsSupported(compatible && enrolled);
    })();
  }, []);

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to continue',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      onSuccess();
    } else {
      setMessage('Biometric authentication failed. Try again.');
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <View className="mt-4">
      <TouchableOpacity onPress={handleBiometric} className="rounded-3xl bg-slate-900 px-4 py-3 items-center">
        <Text className="text-white font-semibold">Use Touch/Face ID</Text>
      </TouchableOpacity>
      {message ? <Text className="text-sm text-red-500 mt-2">{message}</Text> : null}
    </View>
  );
}
