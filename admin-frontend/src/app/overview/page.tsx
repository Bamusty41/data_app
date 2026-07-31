'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { adminFetch } from '@/lib/api';

interface OverviewData {
  totalBalance: number;
  totalDailySales: number;
  totalProfit: number;
  profitMargin: number;
  providerStatus: {
    provider: string;
    status: string;
    balance: number;
    currency: string;
    error: string | null;
  }[];
}

interface ProviderConfig {
  mode: 'AUTOMATIC' | 'MANUAL';
  primary: 'INLOMAX' | 'HUSMODATA';
}

export default function OverviewPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [config, setConfig] = useState<ProviderConfig>({ mode: 'AUTOMATIC', primary: 'INLOMAX' });
  const [loading, setLoading] = useState(true);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ovData, cfgData] = await Promise.all([
        adminFetch<{ data: OverviewData }>('/api/v1/admin/overview'),
        adminFetch<{ data: ProviderConfig }>('/api/v1/admin/provider-config'),
      ]);
      setOverview(ovData.data);
      setConfig(cfgData.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfigChange = async (newMode: 'AUTOMATIC' | 'MANUAL', newPrimary: 'INLOMAX' | 'HUSMODATA') => {
    setUpdatingConfig(true);
    try {
      const res = await adminFetch<{ data: ProviderConfig }>('/api/v1/admin/provider-config', {
        method: 'PATCH',
        body: JSON.stringify({ mode: newMode, primary: newPrimary }),
      });
      setConfig(res.data);
      alert('Provider configuration updated!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingConfig(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-white">Loading Overview...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold text-white">Dashboard Overview</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total User Balance Sum" value={`₦${overview?.totalBalance.toLocaleString() ?? '0'}`} />
        <StatCard title="Total Daily Sales" value={`₦${overview?.totalDailySales.toLocaleString() ?? '0'}`} />
        <StatCard title="Total Profit Margin" value={`₦${overview?.totalProfit.toLocaleString() ?? '0'} (${overview?.profitMargin}% )`} />
        <StatCard title="Active Providers" value={overview?.providerStatus.length ?? 0} />
      </div>

      {/* Provider Fallback Switcher */}
      <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl">
        <h2 className="text-xl font-bold text-indigo-300 mb-4">Fallback & Provider Switcher</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-gray-400 text-sm block mb-1">Routing Mode</span>
            <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
              <button
                onClick={() => handleConfigChange('AUTOMATIC', config.primary)}
                disabled={updatingConfig}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  config.mode === 'AUTOMATIC' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                }`}
              >
                AUTOMATIC Failover
              </button>
              <button
                onClick={() => handleConfigChange('MANUAL', config.primary)}
                disabled={updatingConfig}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  config.mode === 'MANUAL' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                }`}
              >
                MANUAL Primary
              </button>
            </div>
          </div>

          <div>
            <span className="text-gray-400 text-sm block mb-1">Primary Provider</span>
            <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
              <button
                onClick={() => handleConfigChange(config.mode, 'INLOMAX')}
                disabled={updatingConfig}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  config.primary === 'INLOMAX' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                }`}
              >
                Inlomax
              </button>
              <button
                onClick={() => handleConfigChange(config.mode, 'HUSMODATA')}
                disabled={updatingConfig}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  config.primary === 'HUSMODATA' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                }`}
              >
                Husmodata
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Provider API Balances & Status */}
      <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl">
        <h2 className="text-xl font-bold text-indigo-300 mb-4">Live Provider API Balances</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overview?.providerStatus.map((p) => (
            <div key={p.provider} className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-lg">{p.provider}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    p.status === 'OK'
                      ? 'bg-green-900 text-green-300'
                      : p.status === 'LOW'
                      ? 'bg-yellow-900 text-yellow-300'
                      : 'bg-red-900 text-red-300'
                  }`}
                >
                  {p.status}
                </span>
                {p.error && <p className="text-red-400 text-xs mt-1">{p.error}</p>}
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-white">
                  ₦{p.balance.toLocaleString()}
                </span>
                <span className="text-gray-400 text-xs block">{p.currency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
