'use client';

import React, { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api';

interface Transaction {
  id: string;
  reference: string;
  phone_number: string;
  service_type: string;
  network: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  created_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [phoneFilter, setPhoneFilter] = useState<string>('');
  const [refFilter, setRefFilter] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [refundTxId, setRefundTxId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      if (phoneFilter) queryParams.append('phoneNumber', phoneFilter);
      if (refFilter) queryParams.append('reference', refFilter);

      const res = await adminFetch<{ transactions: Transaction[] }>(
        `/api/v1/admin/transactions?${queryParams.toString()}`
      );
      setTransactions(res.transactions || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const handleRetry = async (id: string) => {
    if (!confirm('Are you sure you want to retry this transaction?')) return;
    try {
      await adminFetch(`/api/v1/admin/transactions/${id}/retry`, { method: 'POST' });
      alert('Transaction retry initiated!');
      fetchTransactions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRefund = async () => {
    if (!refundTxId || !actionReason) {
      alert('Compulsory reason is required for refund');
      return;
    }
    try {
      await adminFetch(`/api/v1/admin/transactions/${refundTxId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason }),
      });
      alert('Refund processed successfully!');
      setRefundTxId(null);
      setActionReason('');
      fetchTransactions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-white">Transaction Monitor</h1>

      {/* Filters */}
      <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-gray-700 flex flex-wrap items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white p-3 rounded-xl outline-none"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
        </select>

        <input
          type="text"
          placeholder="Filter by Phone..."
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white p-3 rounded-xl outline-none"
        />

        <input
          type="text"
          placeholder="Filter by Reference..."
          value={refFilter}
          onChange={(e) => setRefFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white p-3 rounded-xl outline-none"
        />

        <button
          onClick={fetchTransactions}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-4">Reference</th>
              <th className="p-4">Service</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">Loading Transactions...</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-800/50">
                  <td className="p-4 font-mono text-xs text-indigo-300">{tx.reference}</td>
                  <td className="p-4">{tx.network} {tx.service_type}</td>
                  <td className="p-4">{tx.phone_number}</td>
                  <td className="p-4 font-bold text-white">₦{Number(tx.amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        tx.status === 'SUCCESS'
                          ? 'bg-green-900 text-green-300'
                          : tx.status === 'PENDING'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-red-900 text-red-300'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-400">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {(tx.status === 'FAILED' || tx.status === 'PENDING') && (
                      <button
                        onClick={() => handleRetry(tx.id)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Manual Retry
                      </button>
                    )}
                    {tx.status !== 'FAILED' && (
                      <button
                        onClick={() => setRefundTxId(tx.id)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Force Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Force Refund Modal */}
      {refundTxId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-white">Force Refund Transaction</h2>
            <p className="text-gray-400 text-sm">
              Please enter the compulsory administrative reason for refunding this transaction.
            </p>
            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Customer debited but provider failed delivery twice"
              className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRefundTxId(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
