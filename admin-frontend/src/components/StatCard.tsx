import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700 flex flex-col items-center">
      {icon && <div className="mb-3 text-indigo-300 text-2xl">{icon}</div>}
      <div className="text-2xl font-semibold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm uppercase tracking-wide">{title}</div>
    </div>
  );
}
