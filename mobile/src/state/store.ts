// mobile/src/state/store.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, WalletState, PurchaseState } from '../types';

export interface AppStore extends AuthState, WalletState, PurchaseState {}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Auth slice
      token: null,
      setToken: (token) => set({ token }),
      clearAuth: () => set({ token: null }),

      // Wallet slice
      balance: 0,
      setBalance: (balance) => set({ balance }),
      updateBalance: (delta) => set({ balance: get().balance + delta }),

      // Purchase slice
      selectedNetwork: null,
      setNetwork: (network) => set({ selectedNetwork: network }),
      selectedCategory: null,
      setCategory: (cat) => set({ selectedCategory: cat }),
      selectedPlan: null,
      setPlan: (plan) => set({ selectedPlan: plan }),
      phoneNumber: '',
      setPhoneNumber: (num) => set({ phoneNumber: num }),
      amount: 0,
      setAmount: (amt) => set({ amount: amt }),
    }),
    {
      name: 'mobile-app-store', // storage key
    },
  ),
);
