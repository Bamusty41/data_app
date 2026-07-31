import create from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  walletBalance: number;
  dedicatedAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  selectedNetwork: 'MTN' | 'Airtel' | 'Glo' | '9Mobile';
  selectedCategory: 'SME' | 'Corporate Gifting' | 'Direct Data';
  selectedPlan: string;
  phoneNumber: string;
  isBalanceHidden: boolean;
  networkPlans: Record<string, string[]>;
  setAuthenticated: (value: boolean) => void;
  toggleBalanceHidden: () => void;
  setSelectedNetwork: (network: AuthState['selectedNetwork']) => void;
  setSelectedCategory: (category: AuthState['selectedCategory']) => void;
  setSelectedPlan: (plan: string) => void;
  setPhoneNumber: (phone: string) => void;
  setWalletBalance: (balance: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  walletBalance: 34520.5,
  dedicatedAccount: {
    bankName: 'Zenith Bank',
    accountNumber: '1234567890',
    accountName: 'Strowallet Ltd',
  },
  selectedNetwork: 'MTN',
  selectedCategory: 'Direct Data',
  selectedPlan: '1.5GB',
  phoneNumber: '',
  isBalanceHidden: false,
  networkPlans: {
    MTN: ['1.5GB - ₦1,200', '3.5GB - ₦2,500', '5GB - ₦3,400'],
    Airtel: ['1GB - ₦1,100', '2.5GB - ₦2,300', '5GB - ₦3,100'],
    Glo: ['1GB - ₦950', '2GB - ₦1,800', '4GB - ₦2,900'],
    '9Mobile': ['1GB - ₦1,250', '3GB - ₦2,900', '6GB - ₦4,900'],
  },
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  toggleBalanceHidden: () => set((state) => ({ isBalanceHidden: !state.isBalanceHidden })),
  setSelectedNetwork: (network) => set({ selectedNetwork: network, selectedPlan: '' }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedPlan: (plan) => set({ selectedPlan: plan }),
  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  setWalletBalance: (balance) => set({ walletBalance: balance }),
}));
