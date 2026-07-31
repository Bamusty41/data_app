import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAppStore } from '../state/store';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { formatPhone } from '../utils/formatPhone';

/**
 * DashboardScreen – shows wallet balance (hide/show), virtual account info, and quick actions.
 */
export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const token = useAppStore((s) => s.token);
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{ bankName: string; accountNumber: string; accountName: string } | null>(null);

  const fetchWallet = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/wallets/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch wallet');
      setBalance(data.balance);
      setAccountInfo({
        bankName: data.virtual_bank_name,
        accountNumber: data.virtual_account_number,
        accountName: data.virtual_account_name,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const copyToClipboard = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${value} copied to clipboard`);
  };

  const QuickAction = (title: string, onPress: () => void) => (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress} accessible accessibilityLabel={title}>
      <Text style={styles.quickBtnText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container} accessible accessibilityLabel="Dashboard screen">
      <Text style={styles.header}>My Wallet</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>₦{showBalance ? Number(balance).toLocaleString() : '••••••'}</Text>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)} accessibilityLabel={showBalance ? 'Hide balance' : 'Show balance'}>
              <MaterialIcons name={showBalance ? 'visibility' : 'visibility-off'} size={24} color="#555" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {accountInfo && (
        <View style={styles.accountInfo} accessible accessibilityLabel="Virtual account details">
          <Text style={styles.accountLabel}>Bank: {accountInfo.bankName}</Text>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Account No: {formatPhone(accountInfo.accountNumber)}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(accountInfo.accountNumber)} accessibilityLabel="Copy account number">
              <MaterialIcons name="content-copy" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <Text style={styles.accountLabel}>Account Name: {accountInfo.accountName}</Text>
        </View>
      )}

      <View style={styles.quickActions} accessible accessibilityLabel="Quick actions">
        {QuickAction('Buy Data', () => navigation.navigate('Purchase' as never, { serviceType: 'DATA' } as never))}
        {QuickAction('Buy Airtime', () => navigation.navigate('Purchase' as never, { serviceType: 'AIRTIME' } as never))}
        {QuickAction('History', () => navigation.navigate('History' as never))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  balanceContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  balanceLabel: { color: '#777', fontSize: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  balanceValue: { fontSize: 28, fontWeight: '600', marginRight: 8 },
  accountInfo: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16 },
  accountLabel: { fontSize: 16, marginBottom: 4 },
  accountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  quickBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6 },
  quickBtnText: { color: '#fff', fontWeight: '600' },
});
