'use client';

import React, { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  created_at: string;
  wallet?: {
    balance: number;
  };
}

interface UserDetail extends User {
  ledger: {
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    reference: string;
    created_at: string;
  }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [adjustModalUser, setAdjustModalUser] = useState<User | null>(null);

  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminFetch<{ users: User[] }>(`/api/v1/admin/users?search=${search}`);
      setUsers(res.users || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewDetail = async (user: User) => {
    try {
      const res = await adminFetch<{ data: UserDetail }>(`/api/v1/admin/users/${user.id}`);
      setSelectedUser(res.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to change status to ${nextStatus}?`)) return;
    try {
      await adminFetch(`/api/v1/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      alert(`User status updated to ${nextStatus}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustModalUser || !adjustAmount || !adjustReason) {
      alert('Compulsory reason and amount are required');
      return;
    }
    try {
      await adminFetch(`/api/v1/admin/users/${adjustModalUser.id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({
          type: adjustType,
          amount: Number(adjustAmount),
          reason: adjustReason,
        }),
      });
      alert('User balance adjusted successfully!');
      setAdjustModalUser(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-white">User Management</h1>

      {/* Search Bar */}
      <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-gray-700 flex gap-4">
        <input
          type="text"
          placeholder="Search by Name, Email, or Phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-white p-3 rounded-xl outline-none"
        />
        <button
          onClick={fetchUsers}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
        >
          Search
        </button>
      </div>

      {/* User Table */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Balance</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">Loading Users...</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/50">
                  <td className="p-4 font-bold text-white">{u.full_name}</td>
                  <td className="p-4 text-sm">{u.email}</td>
                  <td className="p-4 text-sm">{u.phone}</td>
                  <td className="p-4 font-bold text-green-400">
                    ₦{Number(u.wallet?.balance ?? 0).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-red-900 text-red-300'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleViewDetail(u)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Ledger History
                    </button>
                    <button
                      onClick={() => setAdjustModalUser(u)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Adjust Balance
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold text-white ${
                        u.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ledger History Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h2 className="text-xl font-bold text-white">
                Ledger History for {selectedUser.full_name}
              </h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white font-bold">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {selectedUser.ledger.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No ledger records found.</p>
              ) : (
                selectedUser.ledger.map((item) => (
                  <div key={item.id} className="bg-gray-900 p-3 rounded-xl border border-gray-700 flex justify-between items-center">
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${
                        item.type === 'CREDIT' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-white text-sm font-medium">{item.description}</span>
                      <span className="text-gray-500 text-xs block mt-0.5">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <span className={`font-bold ${item.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                      {item.type === 'CREDIT' ? '+' : '-'}₦{Number(item.amount).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-white">
              Adjust Balance ({adjustModalUser.full_name})
            </h2>

            <div>
              <label className="text-gray-300 text-sm block mb-1">Adjustment Type</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl outline-none"
              >
                <option value="CREDIT">CREDIT (Add Funds)</option>
                <option value="DEBIT">DEBIT (Deduct Funds)</option>
              </select>
            </div>

            <div>
              <label className="text-gray-300 text-sm block mb-1">Amount (₦)</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="text-gray-300 text-sm block mb-1">Compulsory Reason</label>
              <textarea
                rows={3}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Bank transfer reconciliation"
                className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAdjustModalUser(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustBalance}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
