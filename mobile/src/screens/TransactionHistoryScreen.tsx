import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { apiRequest } from '../services/api';
import { MaterialIcons } from '@expo/vector-icons';

interface Transaction {
  id: string;
  reference: string;
  service_type: string;
  network: string;
  phone_number: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  created_at: string;
  provider?: string;
}

export const TransactionHistoryScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await apiRequest('/api/v1/transactions/user/me');
      setTransactions(res.data || res.transactions || []);
    } catch (err: any) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-900 text-green-300 border-green-700';
      case 'PENDING':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      default:
        return 'bg-red-900 text-red-300 border-red-700';
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      onPress={() => setSelectedTx(item)}
      className="bg-gray-800 p-4 mb-3 rounded-xl border border-gray-700 flex-row justify-between items-center"
    >
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-white font-bold mr-2">
            {item.network} {item.service_type}
          </Text>
          <View
            className={`px-2 py-0.5 rounded-full border ${getBadgeColor(
              item.status
            )}`}
          >
            <Text className="text-xs font-semibold">{item.status}</Text>
          </View>
        </View>
        <Text className="text-gray-400 text-sm">{item.phone_number}</Text>
        <Text className="text-gray-500 text-xs mt-1">
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      <Text className="text-white font-extrabold text-base">
        ₦{Number(item.amount).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-900 p-5">
      <Text className="text-2xl font-bold text-white mb-6">Transaction History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#818CF8" className="mt-10" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id || item.reference}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#818CF8"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-10">
              <MaterialIcons name="history" size={48} color="#4B5563" />
              <Text className="text-gray-400 mt-2">No transactions recorded yet</Text>
            </View>
          }
        />
      )}

      {/* Transaction Details Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-gray-800 p-6 rounded-t-3xl border-t border-gray-700">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-white">Transaction Details</Text>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View className="space-y-3">
                <View className="flex-row justify-between border-b border-gray-700 py-2">
                  <Text className="text-gray-400">Reference</Text>
                  <Text className="text-white font-mono text-xs">{selectedTx.reference}</Text>
                </View>
                <View className="flex-row justify-between border-b border-gray-700 py-2">
                  <Text className="text-gray-400">Service</Text>
                  <Text className="text-white font-semibold">
                    {selectedTx.network} {selectedTx.service_type}
                  </Text>
                </View>
                <View className="flex-row justify-between border-b border-gray-700 py-2">
                  <Text className="text-gray-400">Phone</Text>
                  <Text className="text-white font-semibold">{selectedTx.phone_number}</Text>
                </View>
                <View className="flex-row justify-between border-b border-gray-700 py-2">
                  <Text className="text-gray-400">Amount</Text>
                  <Text className="text-green-400 font-bold">
                    ₦{Number(selectedTx.amount).toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between border-b border-gray-700 py-2">
                  <Text className="text-gray-400">Status</Text>
                  <Text className="text-white font-bold">{selectedTx.status}</Text>
                </View>
                <View className="flex-row justify-between py-2">
                  <Text className="text-gray-400">Date</Text>
                  <Text className="text-gray-300 text-xs">
                    {new Date(selectedTx.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
