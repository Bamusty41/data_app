import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export const adminApi = {
  getOverview: () => api.get('/admin/overview'),
  getProviderBalances: () => api.get('/admin/provider-balances'),
  getProviderConfig: () => api.get('/admin/provider-config'),
  setProviderConfig: (payload: { mode: 'AUTOMATIC' | 'MANUAL'; primary: string }) => api.patch('/admin/provider-config', payload),
  getPricing: () => api.get('/admin/pricing'),
  updatePricing: (data: any) => api.patch('/admin/pricing', data),
  listTransactions: (params: Record<string, any>) => api.get('/admin/transactions', { params }),
  retryTransaction: (transactionId: string) => api.post(`/admin/transactions/${transactionId}/retry`),
  refundTransaction: (transactionId: string, reason: string) => api.post(`/admin/transactions/${transactionId}/refund`, { reason }),
  searchUsers: (params: Record<string, any>) => api.get('/admin/users', { params }),
  getUserDetail: (userId: string) => api.get(`/admin/users/${userId}`),
  adjustUserBalance: (userId: string, payload: any) => api.post(`/admin/users/${userId}/adjust-balance`, payload),
  updateUserStatus: (userId: string, payload: any) => api.patch(`/admin/users/${userId}/status`, payload),
};
