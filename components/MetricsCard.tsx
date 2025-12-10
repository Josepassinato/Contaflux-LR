import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  colorClass: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, change, trend, icon, colorClass }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm">
        {trend === 'up' && <ArrowUpRight size={16} className="text-emerald-500" />}
        {trend === 'down' && <ArrowDownRight size={16} className="text-red-500" />}
        {trend === 'neutral' && <Minus size={16} className="text-slate-400" />}
        <span className={`font-medium ${
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
        }`}>
          {change}
        </span>
        <span className="text-slate-400 ml-1">vs. mês anterior</span>
      </div>
    </div>
  );
};