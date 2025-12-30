import React, { useMemo } from 'react';
import { MetricsCard } from '../components/MetricsCard';
import { DollarSign, AlertTriangle, CheckCircle2, FileText, Activity, BarChart3, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Company, FiscalDocument, Obligation } from '../types';
import { validatorService } from '../services/validatorService';


interface DashboardProps {
    company: Company;
    documents?: FiscalDocument[];
    obligations?: Obligation[];
    logs?: any[]; // Manter para compatibilidade
}

export const Dashboard: React.FC<DashboardProps> = ({ company, documents = [], obligations = [] }) => {
  const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = lastMonthDate.toISOString().substring(0, 7);

  const { currentMonthData, lastMonthData, fiscalRisks } = useMemo(() => {
    const processMonthData = (monthKey: string) => {
      const monthDocs = documents.filter(d => d.date.startsWith(monthKey));
      const revenue = monthDocs.filter(d => d.operation_type === 'exit').reduce((sum, d) => sum + d.amount, 0);
      const credits = monthDocs.filter(d => d.operation_type === 'entry').reduce((sum, d) => sum + d.total_pis + d.total_cofins, 0);
      const debits = monthDocs.filter(d => d.operation_type === 'exit').reduce((sum, d) => sum + d.total_pis + d.total_cofins, 0);
      const taxPayable = Math.max(0, debits - credits);
      return { revenue, credits, taxPayable, docCount: monthDocs.length };
    };

    const currentData = processMonthData(currentMonthKey);
    const lastData = processMonthData(lastMonthKey);

    const allIssues = validatorService.validateSped(documents.filter(d => d.date.startsWith(currentMonthKey)));
    const criticalRisks = allIssues.filter(i => i.severity === 'error');

    return { 
        currentMonthData: currentData, 
        lastMonthData: lastData,
        fiscalRisks: criticalRisks
    };
  }, [documents, currentMonthKey, lastMonthKey]);
  
  const chartData = [
    { name: 'Mês Anterior', revenue: lastMonthData.revenue, tax: lastMonthData.taxPayable },
    { name: 'Mês Atual', revenue: currentMonthData.revenue, tax: currentMonthData.taxPayable },
  ];

  if (!company) {
    return <div className="p-8 text-center text-slate-500">Carregando dados da empresa...</div>;
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Operacional</h1>
          <p className="text-slate-500">Análise da competência atual: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric'})}</p>
        </div>
        
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard 
                title="Receita do Mês"
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(currentMonthData.revenue)}
                change={`${(((currentMonthData.revenue - lastMonthData.revenue) / (lastMonthData.revenue || 1)) * 100).toFixed(1)}%`}
                trend={currentMonthData.revenue >= lastMonthData.revenue ? 'up' : 'down'}
                icon={<DollarSign size={20} />}
                colorClass="text-blue-600"
            />
             <MetricsCard 
                title="Créditos Apurados (PIS/COF)"
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(currentMonthData.credits)}
                change={`${(((currentMonthData.credits - lastMonthData.credits) / (lastMonthData.credits || 1)) * 100).toFixed(1)}%`}
                trend={currentMonthData.credits >= lastMonthData.credits ? 'up' : 'down'}
                icon={<TrendingDown size={20} />}
                colorClass="text-emerald-600"
            />
            <MetricsCard 
                title="Impostos a Pagar (Est.)"
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(currentMonthData.taxPayable)}
                change={`${(((currentMonthData.taxPayable - lastMonthData.taxPayable) / (lastMonthData.taxPayable || 1)) * 100).toFixed(1)}%`}
                trend={currentMonthData.taxPayable > lastMonthData.taxPayable ? 'down' : 'up'}
                icon={<TrendingUp size={20} />}
                colorClass="text-red-600"
            />
             <MetricsCard 
                title="Riscos Fiscais (Críticos)"
                value={fiscalRisks.length.toString()}
                change="Apontamentos do PVA Lite"
                trend={fiscalRisks.length > 0 ? 'down' : 'up'}
                icon={<Shield size={20} />}
                colorClass="text-amber-600"
            />
        </div>

        {/* Chart and Risks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Comparativo Mensal</h3>
                <div className="h-72">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value as number)} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                        />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{top: 0, right: 0}} />
                        <Bar dataKey="revenue" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="tax" name="Impostos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" />
                    Painel de Alertas
                </h3>
                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                    {fiscalRisks.length === 0 ? (
                        <div className="text-center py-10 text-emerald-600">
                            <CheckCircle2 size={32} className="mx-auto mb-2" />
                            <p className="font-medium">Nenhum risco crítico detectado!</p>
                        </div>
                    ) : (
                        fiscalRisks.slice(0, 5).map((risk, index) => (
                            <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                <p className="text-sm font-bold text-amber-800">{risk.message}</p>
                                {risk.details && <p className="text-xs text-amber-700 mt-1 truncate">{risk.details}</p>}
                            </div>
                        ))
                    )}
                     {fiscalRisks.length > 5 && <p className="text-center text-xs text-slate-400 mt-2">... e mais {fiscalRisks.length - 5} alertas.</p>}
                </div>
            </div>
        </div>

    </div>
  );
};
