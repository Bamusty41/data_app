'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../lib/api';

const statusOptions = ['SUCCESS', 'FAILED', 'PENDING'] as const;
const providerOptions = ['INLOMAX', 'HUSMODATA'] as const;
const networkOptions = ['MTN', 'AIRTEL', 'GLO', 'NINE_MOBILE'] as const;

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [providerBalances, setProviderBalances] = useState<any[]>([]);
  const [providerConfig, setProviderConfig] = useState<any>({ mode: 'AUTOMATIC', primary: 'INLOMAX' });
  const [pricing, setPricing] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionFilters, setTransactionFilters] = useState({ status: '', reference: '', phoneNumber: '' });
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedPricing, setSelectedPricing] = useState<any>(null);
  const [adjustPayload, setAdjustPayload] = useState({ amount: '', type: 'CREDIT', reason: '' });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);

  useEffect(() => {
    loadOverview();
    loadProviderBalances();
    loadProviderConfig();
    loadPricing();
    loadTransactions();
  }, []);

  const loadOverview = async () => {
    const { data } = await adminApi.getOverview();
    setOverview(data.data);
  };
  const loadProviderBalances = async () => {
    const { data } = await adminApi.getProviderBalances();
    setProviderBalances(data.data);
  };
  const loadProviderConfig = async () => {
    const { data } = await adminApi.getProviderConfig();
    setProviderConfig(data.data);
  };
  const loadPricing = async () => {
    const { data } = await adminApi.getPricing();
    setPricing(data.data);
  };
  const loadTransactions = async (params: Record<string, any> = {}) => {
    const { data } = await adminApi.listTransactions({ limit: 20, ...params });
    setTransactions(data.transactions);
  };
  const searchUsers = async () => {
    const { data } = await adminApi.searchUsers({ search: userSearch, limit: 20 });
    setUsers(data.users);
  };

  const handleToggleProviderMode = async (mode: 'AUTOMATIC' | 'MANUAL') => {
    const payload = { mode, primary: providerConfig.primary };
    const { data } = await adminApi.setProviderConfig(payload);
    setProviderConfig(data.data);
  };

  const handlePrimaryProviderChange = async (primary: string) => {
    const payload = { mode: providerConfig.mode, primary };
    const { data } = await adminApi.setProviderConfig(payload);
    setProviderConfig(data.data);
  };

  const handlePricingSelect = (item: any) => {
    setSelectedPricing({ ...item });
  };

  const savePricing = async () => {
    if (!selectedPricing) return;
    const { data } = await adminApi.updatePricing(selectedPricing);
    setSelectedPricing(data.data);
    await loadPricing();
  };

  const handleTransactionAction = async (id: string, type: 'retry' | 'refund') => {
    if (type === 'retry') {
      await adminApi.retryTransaction(id);
    } else {
      await adminApi.refundTransaction(id, 'Admin forced refund');
    }
    await loadTransactions(transactionFilters);
  };

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    const { data } = await adminApi.getUserDetail(userId);
    setSelectedUserDetail(data.data);
  };

  const handleAdjustBalance = async () => {
    if (!selectedUserId) return;
    await adminApi.adjustUserBalance(selectedUserId, {
      type: adjustPayload.type,
      amount: Number(adjustPayload.amount),
      reason: adjustPayload.reason,
    });
    if (selectedUserId) await handleSelectUser(selectedUserId);
  };

  const handleUserStatus = async (status: 'ACTIVE' | 'SUSPENDED') => {
    if (!selectedUserId) return;
    await adminApi.updateUserStatus(selectedUserId, { status });
    await handleSelectUser(selectedUserId);
  };

  const providerHealth = useMemo(() => providerBalances.map((balance) => ({
    ...balance,
    status: balance.error ? 'UNAVAILABLE' : balance.balance > 2500 ? 'OK' : 'LOW',
  })), [providerBalances]);

  return (
    <main className="min-h-screen px-8 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-2">Manage users, pricing, provider health, and transaction recovery.</p>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-4">
        <card className="rounded-3xl bg-slate-900 p-6">
          <p className="text-slate-400 uppercase tracking-[0.2em] text-xs">Total Wallet Balance</p>
          <p className="mt-4 text-3xl font-semibold text-white">₦{overview?.totalBalance?.toLocaleString() ?? '0'}</p>
        </card>
        <card className="rounded-3xl bg-slate-900 p-6">
          <p className="text-slate-400 uppercase tracking-[0.2em] text-xs">Daily Sales</p>
          <p className="mt-4 text-3xl font-semibold text-white">₦{overview?.totalDailySales?.toLocaleString() ?? '0'}</p>
        </card>
        <card className="rounded-3xl bg-slate-900 p-6">
          <p className="text-slate-400 uppercase tracking-[0.2em] text-xs">Profit Margin</p>
          <p className="mt-4 text-3xl font-semibold text-white">{overview?.profitMargin ?? 0}%</p>
        </card>
        <card className="rounded-3xl bg-slate-900 p-6">
          <p className="text-slate-400 uppercase tracking-[0.2em] text-xs">Provider Mode</p>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => handleToggleProviderMode('AUTOMATIC')} className={`rounded-full px-4 py-2 ${providerConfig.mode === 'AUTOMATIC' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Auto
            </button>
            <button onClick={() => handleToggleProviderMode('MANUAL')} className={`rounded-full px-4 py-2 ${providerConfig.mode === 'MANUAL' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Manual
            </button>
          </div>
        </card>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">Provider Status Health</h2>
          <div className="mt-5 space-y-3">
            {providerHealth.map((provider) => (
              <div key={provider.provider} className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{provider.provider}</p>
                    <p className="text-lg font-semibold text-white">₦{provider.balance?.toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${provider.status === 'OK' ? 'bg-emerald-500/15 text-emerald-300' : provider.status === 'LOW' ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'}`}>{provider.status}</span>
                </div>
                {provider.error && <p className="mt-2 text-sm text-red-300">{provider.error}</p>}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl bg-slate-800 p-4">
            <p className="text-slate-400">Primary Provider</p>
            <select value={providerConfig.primary} onChange={(event) => handlePrimaryProviderChange(event.target.value)} className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900 p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-white">Data Plan Pricing</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Sell Price</th>
                  <th className="px-4 py-3">Markup</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pricing.map((plan) => (
                  <tr key={`${plan.provider}-${plan.network}-${plan.planId}`} className="hover:bg-slate-950/50">
                    <td className="px-4 py-3 text-slate-200">{plan.provider}</td>
                    <td className="px-4 py-3 text-slate-200">{plan.network}</td>
                    <td className="px-4 py-3 text-slate-200">{plan.planId}</td>
                    <td className="px-4 py-3 text-slate-200">₦{plan.providerCost}</td>
                    <td className="px-4 py-3 text-slate-200">₦{plan.sellPrice}</td>
                    <td className="px-4 py-3 text-slate-200">{plan.markup}%</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handlePricingSelect(plan)} className="rounded-2xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedPricing ? (
            <div className="mt-6 rounded-3xl bg-slate-950 p-5">
              <h3 className="text-lg font-semibold text-white">Edit Pricing</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm text-slate-400">Provider</label>
                  <input value={selectedPricing.provider} disabled className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Network</label>
                  <input value={selectedPricing.network} disabled className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Plan</label>
                  <input value={selectedPricing.planId} disabled className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white" />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-400">Provider Cost</label>
                  <input type="number" value={selectedPricing.providerCost} onChange={(event) => setSelectedPricing({ ...selectedPricing, providerCost: Number(event.target.value) })} className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Sell Price</label>
                  <input type="number" value={selectedPricing.sellPrice} onChange={(event) => setSelectedPricing({ ...selectedPricing, sellPrice: Number(event.target.value) })} className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white" />
                </div>
              </div>
              <button onClick={savePricing} className="mt-5 rounded-3xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950">Save Pricing</button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-slate-900 p-6 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Transaction Monitor</h2>
              <p className="text-slate-400">Filter transactions by status or reference.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select value={transactionFilters.status} onChange={(event) => setTransactionFilters({ ...transactionFilters, status: event.target.value })} className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200">
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button onClick={() => loadTransactions(transactionFilters)} className="rounded-3xl bg-indigo-600 px-5 py-3 text-white">Refresh</button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-950/50">
                    <td className="px-4 py-3 text-slate-200">{txn.reference}</td>
                    <td className="px-4 py-3 text-slate-200">{txn.phone_number}</td>
                    <td className="px-4 py-3 text-slate-200">{txn.network}</td>
                    <td className="px-4 py-3 text-slate-200">₦{Number(txn.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-200">{txn.status}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleTransactionAction(txn.id, 'retry')} className="mr-2 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Retry</button>
                      <button onClick={() => handleTransactionAction(txn.id, 'refund')} className="rounded-2xl bg-red-600 px-3 py-2 text-xs font-semibold text-white">Refund</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">User Management</h2>
          <div className="mt-4 flex gap-3">
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search users" className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            <button onClick={searchUsers} className="rounded-3xl bg-indigo-600 px-5 py-3 text-white">Search</button>
          </div>
          <div className="mt-5 space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {users.map((user) => (
              <button key={user.id} onClick={() => handleSelectUser(user.id)} className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-4 text-left hover:border-indigo-500">
                <p className="font-semibold text-white">{user.full_name}</p>
                <p className="text-slate-400 text-sm">{user.email} · {user.status}</p>
              </button>
            ))}
          </div>
          {selectedUserDetail ? (
            <div className="mt-5 rounded-3xl bg-slate-950 p-4">
              <p className="text-slate-400 text-sm">Selected User</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{selectedUserDetail.full_name}</h3>
              <p className="text-slate-400">{selectedUserDetail.email} · {selectedUserDetail.phone}</p>
              <p className="mt-3 text-slate-300">Wallet: ₦{Number(selectedUserDetail.wallet?.balance ?? 0).toFixed(2)}</p>
              <div className="mt-4 grid gap-3">
                <button onClick={() => handleUserStatus(selectedUserDetail.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')} className="rounded-3xl bg-yellow-600 px-4 py-3 text-white">
                  {selectedUserDetail.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'} User
                </button>
                <div className="rounded-3xl bg-slate-900 p-4">
                  <p className="text-slate-300">Manual Balance Adjustment</p>
                  <div className="mt-3 grid gap-3">
                    <select value={adjustPayload.type} onChange={(event) => setAdjustPayload({ ...adjustPayload, type: event.target.value as 'CREDIT' | 'DEBIT' })} className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                      <option value="CREDIT">Credit</option>
                      <option value="DEBIT">Debit</option>
                    </select>
                    <input type="number" value={adjustPayload.amount} onChange={(event) => setAdjustPayload({ ...adjustPayload, amount: event.target.value })} placeholder="Amount" className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
                    <input value={adjustPayload.reason} onChange={(event) => setAdjustPayload({ ...adjustPayload, reason: event.target.value })} placeholder="Reason" className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
                    <button onClick={handleAdjustBalance} className="rounded-3xl bg-emerald-500 px-4 py-3 text-slate-950">Apply Adjustment</button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
