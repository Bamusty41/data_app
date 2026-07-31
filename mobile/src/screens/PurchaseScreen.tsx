import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { MaterialIcons } from '@expo/vector-icons';
import { PinModal } from '../components/PinModal';
import { detectNetwork, NetworkName } from '../utils/networkDetect';
import { formatPhone } from '../utils/formatPhone';
import { apiRequest } from '../services/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../state/store';

const NETWORKS: { id: NetworkName; label: string; color: string }[] = [
  { id: 'MTN', label: 'MTN', color: '#EAB308' },
  { id: 'AIRTEL', label: 'Airtel', color: '#EF4444' },
  { id: 'GLO', label: 'Glo', color: '#22C55E' },
  { id: 'NINE_MOBILE', label: '9Mobile', color: '#10B981' },
];

const CATEGORIES = ['SME', 'Corporate Gifting', 'Direct Data'];

interface Plan {
  id: string;
  name: string;
  price: number;
}

export const PurchaseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const serviceType: 'DATA' | 'AIRTIME' = route.params?.serviceType || 'DATA';

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkName>('MTN');
  const [selectedCategory, setSelectedCategory] = useState<string>('SME');
  const [phone, setPhone] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);

  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);

  // Auto-detect network when phone number changes
  useEffect(() => {
    if (phone.length >= 4) {
      const detected = detectNetwork(phone);
      if (detected) {
        setSelectedNetwork(detected);
      }
    }
  }, [phone]);

  // Load plans based on network and category
  useEffect(() => {
    if (serviceType === 'DATA') {
      loadDataPlans(selectedNetwork, selectedCategory);
    }
  }, [selectedNetwork, selectedCategory, serviceType]);

  const loadDataPlans = async (network: string, category: string) => {
    setLoadingPlans(true);
    try {
      // Mock plan list mapped to realistic Nigerian VTU prices
      const planData: Record<string, Plan[]> = {
        MTN: [
          { id: '1.5GB', name: '1.5GB (30 Days)', price: 1000 },
          { id: '3.5GB', name: '3.5GB (30 Days)', price: 2000 },
          { id: '5GB', name: '5GB (30 Days)', price: 2800 },
          { id: '10GB', name: '10GB (30 Days)', price: 5000 },
        ],
        AIRTEL: [
          { id: '1.5GB', name: '1.5GB (30 Days)', price: 1050 },
          { id: '3.5GB', name: '3.5GB (30 Days)', price: 2100 },
          { id: '5GB', name: '5GB (30 Days)', price: 2900 },
        ],
        GLO: [
          { id: '1.5GB', name: '1.5GB (30 Days)', price: 950 },
          { id: '3.5GB', name: '3.5GB (30 Days)', price: 1900 },
          { id: '5GB', name: '5GB (30 Days)', price: 2700 },
        ],
        NINE_MOBILE: [
          { id: '1.5GB', name: '1.5GB (30 Days)', price: 1000 },
          { id: '3.5GB', name: '3.5GB (30 Days)', price: 2000 },
        ],
      };
      const networkPlans = planData[network] || [];
      setPlans(networkPlans);
      if (networkPlans.length > 0) setSelectedPlan(networkPlans[0]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const pickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        if (data.length > 0) {
          const contact = data[0];
          if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
            setPhone(contact.phoneNumbers[0].number || '');
          }
        }
      } else {
        Alert.alert('Permission Denied', 'Permission to access contacts was denied.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleProceed = () => {
    if (!phone || phone.trim().length < 10) {
      Alert.alert('Invalid Input', 'Please enter a valid phone number.');
      return;
    }
    if (serviceType === 'AIRTIME' && (!amount || Number(amount) < 50)) {
      Alert.alert('Invalid Amount', 'Minimum airtime purchase is ₦50.');
      return;
    }
    const totalCost = serviceType === 'DATA' ? selectedPlan?.price || 0 : Number(amount);
    if (totalCost > Number(balance)) {
      Alert.alert('Insufficient Balance', 'Please fund your wallet before making this purchase.');
      return;
    }
    setShowPinModal(true);
  };

  const executePurchase = async (pin: string) => {
    setShowPinModal(false);
    setSubmitting(true);
    try {
      const payload = {
        serviceType,
        network: selectedNetwork,
        phoneNumber: formatPhone(phone),
        planId: serviceType === 'DATA' ? selectedPlan?.id : undefined,
        amount: serviceType === 'DATA' ? selectedPlan?.price : Number(amount),
        transactionPin: pin,
        reference: `MOB-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      };

      const result = await apiRequest('/api/v1/vtu/purchase', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (result.data?.newBalance !== undefined) {
        setBalance(result.data.newBalance);
      }

      Alert.alert('Success 🎉', `Your ${serviceType.toLowerCase()} purchase was successful!`, [
        { text: 'OK', onPress: () => navigation.navigate('History' as never) },
      ]);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message || 'Transaction processing failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const finalPrice = serviceType === 'DATA' ? selectedPlan?.price || 0 : Number(amount) || 0;

  return (
    <ScrollView className="flex-1 bg-gray-900 p-5">
      <Text className="text-2xl font-bold text-white mb-6">
        Buy {serviceType === 'DATA' ? 'Data Package' : 'Airtime Top-Up'}
      </Text>

      {/* Network Selector */}
      <Text className="text-gray-300 font-semibold mb-3">Select Network</Text>
      <View className="flex-row justify-between mb-6">
        {NETWORKS.map((net) => {
          const isSelected = selectedNetwork === net.id;
          return (
            <TouchableOpacity
              key={net.id}
              onPress={() => setSelectedNetwork(net.id)}
              className={`flex-1 py-3 mx-1 rounded-xl items-center border-2 ${
                isSelected ? 'border-indigo-500 bg-gray-800' : 'border-gray-700 bg-gray-900'
              }`}
            >
              <View
                className="w-4 h-4 rounded-full mb-1"
                style={{ backgroundColor: net.color }}
              />
              <Text className={`font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                {net.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Selector for Data */}
      {serviceType === 'DATA' && (
        <>
          <Text className="text-gray-300 font-semibold mb-3">Select Category</Text>
          <View className="flex-row mb-6">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className={`px-4 py-2 mr-2 rounded-full border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 border-indigo-500'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <Text className="text-white text-xs font-semibold">{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Phone Number Input with Contact Picker */}
      <Text className="text-gray-300 font-semibold mb-2">Recipient Phone Number</Text>
      <View className="flex-row items-center bg-gray-800 border border-gray-700 rounded-xl px-4 py-1 mb-6">
        <TextInput
          placeholder="08012345678"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          className="flex-1 text-white text-lg py-2"
        />
        <TouchableOpacity onPress={pickContact} className="p-2">
          <MaterialIcons name="contacts" size={24} color="#818CF8" />
        </TouchableOpacity>
      </View>

      {/* Data Plan Selection or Airtime Amount */}
      {serviceType === 'DATA' ? (
        <>
          <Text className="text-gray-300 font-semibold mb-2">Choose Plan</Text>
          {loadingPlans ? (
            <ActivityIndicator color="#818CF8" className="my-4" />
          ) : (
            <View className="mb-6">
              {plans.map((p) => {
                const isSel = selectedPlan?.id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPlan(p)}
                    className={`flex-row justify-between items-center p-4 mb-2 rounded-xl border ${
                      isSel ? 'bg-indigo-950 border-indigo-500' : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <Text className="text-white font-medium">{p.name}</Text>
                    <Text className="text-indigo-400 font-bold">₦{p.price.toLocaleString()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      ) : (
        <>
          <Text className="text-gray-300 font-semibold mb-2">Amount (₦)</Text>
          <TextInput
            placeholder="e.g. 500"
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            className="bg-gray-800 border border-gray-700 text-white text-lg rounded-xl px-4 py-3 mb-6"
          />
        </>
      )}

      {/* Price Summary & Proceed Button */}
      <View className="bg-gray-800 p-4 rounded-xl mb-6 border border-gray-700 flex-row justify-between items-center">
        <Text className="text-gray-400 font-medium">Total Price:</Text>
        <Text className="text-2xl font-extrabold text-green-400">
          ₦{finalPrice.toLocaleString()}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleProceed}
        disabled={submitting}
        className="bg-indigo-600 py-4 rounded-xl items-center mb-10"
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold text-lg">Proceed to Confirm</Text>
        )}
      </TouchableOpacity>

      <PinModal
        visible={showPinModal}
        onConfirm={executePurchase}
        onCancel={() => setShowPinModal(false)}
      />
    </ScrollView>
  );
};
