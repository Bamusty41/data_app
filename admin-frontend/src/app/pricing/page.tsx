'use client';

import React, { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api';

interface PricingPlan {
  id?: number;
  provider: string;
  network: string;
  planId: string;
  providerCost: number;
  sellPrice: number;
  markup: number;
  markupPct?: number;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [sellPriceInput, setSellPriceInput] = useState<string>('');

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const res = await adminFetch<{ data: PricingPlan[] }>('/api/v1/admin/pricing');
      setPlans(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleUpdate = async () => {
    if (!editingPlan || !sellPriceInput) return;
    try {
      await adminFetch('/api/v1/admin/pricing', {
        method: 'PATCH',
        body: JSON.stringify({
          provider: editingPlan.provider,
          network: editingPlan.network,
          planId: editingPlan.planId,
          providerCost: editingPlan.providerCost,
          sellPrice: Number(sellPriceInput),
        }),
      });
      alert('Pricing updated successfully!');
      setEditingPlan(null);
      fetchPricing();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-white">Data Plan Pricing Manager</h1>

      <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-4">Provider</th>
              <th className="p-4">Network</th>
              <th className="p-4">Plan ID</th>
              <th className="p-4">Provider Cost</th>
              <th className="p-4">Selling Price</th>
              <th className="p-4">Markup (%)</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">Loading Pricing Data...</td>
              </tr>
            ) : (
              plans.map((p, idx) => (
                <tr key={idx} className="hover:bg-gray-800/50">
                  <td className="p-4 font-bold text-white">{p.provider}</td>
                  <td className="p-4">{p.network}</td>
                  <td className="p-4 font-mono text-xs">{p.planId}</td>
                  <td className="p-4">₦{p.providerCost.toLocaleString()}</td>
                  <td className="p-4 font-semibold text-green-400">₦{p.sellPrice.toLocaleString()}</td>
                  <td className="p-4 font-bold text-indigo-300">{p.markup ?? p.markupPct ?? 0}%</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setEditingPlan(p);
                        setSellPriceInput(String(p.sellPrice));
                      }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Edit Price
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Pricing Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-white">
              Edit Price ({editingPlan.provider} - {editingPlan.network} - {editingPlan.planId})
            </h2>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Provider Cost</label>
              <input
                disabled
                value={`₦${editingPlan.providerCost}`}
                className="w-full bg-gray-900 border border-gray-700 text-gray-400 p-3 rounded-xl"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">New Selling Price (₦)</label>
              <input
                type="number"
                value={sellPriceInput}
                onChange={(e) => setSellPriceInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
