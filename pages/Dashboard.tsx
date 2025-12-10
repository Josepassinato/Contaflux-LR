
import React, { useState, useMemo } from 'react';
import { MetricsCard } from '../components/MetricsCard';
import { DollarSign, AlertTriangle, CheckCircle2, FileText, Activity, Copy, Check, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Company, SystemLog, FiscalDocument, Obligation } from '../types';

interface DashboardProps {
    company: Company;
    logs?: SystemLog[];
    documents?: FiscalDocument[];
    obligations?: Obligation[];
}

export const Dashboard: React.FC<DashboardProps> = ({ company, logs = [], documents = [], obligations = [] }) => {
  const [copied, setCopied] = useState(false);

  // --- REAL DATA AGGREGATION ---
  
  // 1. Chart Data (Group by Month)
  const chartData = useMemo(() => {
      const grouped: Record<string, { name: string, revenue: number, tax: number }> = {};
      
      // Initialize last 6 months to ensure chart looks good even empty
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const key = d.toISOString().substring(0, 7); // YYYY-MM
          const label = d.toLocaleDateString('pt-BR', { month: 'short' });
          grouped[key] = { name: label, revenue: 0, tax: 0 };
      }

      documents.forEach(doc => {
          const key = doc.date.substring(0, 7);
          if (grouped[key]) {
              if (doc.operation_type === 'exit') {
                  grouped[key].revenue += doc.amount;
              }
              // Approximate tax sum from XML fields for visualization
              grouped[key].tax += (doc.total_icms + doc.total_pis + doc.total_cofins + doc.total_ipi);
          }
      });

      return Object.values(grouped);
  }, [documents]);

  // 2. KPIs
  const currentMonth = new Date().toISOString().substring(0, 7);
  const revenueQuarter = documents
    .filter(d => d.operation_type === 'exit')
    .reduce((sum, d) => sum + d.amount, 0);

  const pendingObligations = obligations.filter(o => o.status === 'pending' || o.status === 'error').length;
  const processedXmls = documents.length;
  
  if (!company) {
    return <div className="p-8 text-center text-slate-500">Carregando dados da empresa...</div>;
  }

  const handleCopyLogs = () => {
    const header = `RELATÓRIO DE AUDITORIA - ${company.name.toUpperCase()}\nCNPJ: ${company.cnpj}\nData Extração: ${new Date().toLocaleString()}\n------------------------------------------------\n`;
    const textLogs = logs.map(l => `[${new Date(l.timestamp).toLocaleString()}] [${l.type.toUpperCase()}] ${l.action}: ${l.details}`).join('\n');
    
    navigator.clipboard.writeText(header + textLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print-content">
      {/* Print Styles */}
      <style>{`
        @media print {
            body > * { display: none !important; }
            .print-content, .print-content * { display: block !important; visibility: visible !important; }
            .print-content { position: absolute; top: 0; left: 0; width: 100%; padding: 20px; background: white; }
            .no-print { display: none !important; }
            /* Reset chart size for print */
            .recharts-wrapper { width: 100% !important; height: 300px !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
          <p className="text-slate-500">Visão consolidada: <span className="font-semibold text-blue-600">{company.name}</span></p>
          <p className="hidden print:block text-xs text-slate-400 mt-1">CNPJ: {company.cnpj} | Data Relatório: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3 no-print self-start md:self-center">
            <button 
                onClick={handleExportReport}
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
            >
                <Printer size={16} /> Exportar
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-200">Apuração</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard 
          title="Receita Total (XMLs)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(revenueQuarter)}
          change="Calculado"
          trend="up"
          icon={<DollarSign size={20} className="text-blue-600" />}
          colorClass="bg-blue-50"
        />
        <MetricsCard 
          title="Obrigações Pendentes"
          value={pendingObligations.toString()}
          change={pendingObligations > 0 ? "Atenção" : "Em dia"}
          trend={pendingObligations > 0 ? "down" : "up"}
          icon={<AlertTriangle size={20} className="text-amber-600" />}
          colorClass="bg-amber-50"
        />
        <MetricsCard 
          title="Apurações Realizadas"
          value={logs.filter(l => l.action.includes('Apuração')).length.toString()}
          change="Automático"
          trend="neutral"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          colorClass="bg-emerald-50"
        />
        <MetricsCard 
          title="XMLs Processados"
          value={processedXmls.toString()}
          change="Total Base"
          trend="up"
          icon={<FileText size={20} className="text-indigo-600" />}
          colorClass="bg-indigo-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Evolução: Receita vs. Impostos (XML)</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{fill: '#f1f5f9'}}
                            formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                        />
                        <Bar dataKey="revenue" name="Receita Bruta" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="tax" name="Impostos (Destacados)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 break-inside-avoid">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Activity className="text-indigo-500" size={20} />
                        <h3 className="text-lg font-bold text-slate-800">Logs de Auditoria (Supabase)</h3>
                    </div>
                    <button 
                        onClick={handleCopyLogs}
                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors no-print"
                        title="Copiar logs para área de transferência"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copied ? 'Copiado!' : 'Copiar Logs'}
                    </button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar print:max-h-full print:overflow-visible">
                    {logs.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Nenhuma atividade registrada.</p>
                    ) : (
                        logs.slice(0, 10).map((log) => (
                            <div key={log.id} className="flex gap-3 text-sm pb-3 border-b border-slate-50 last:border-0">
                                <span className="text-slate-400 text-xs whitespace-nowrap w-24 pt-1">
                                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <div>
                                    <p className={`font-semibold ${
                                        log.type === 'error' ? 'text-red-600' :
                                        log.type === 'success' ? 'text-emerald-600' :
                                        'text-slate-700'
                                    }`}>{log.action}</p>
                                    <p className="text-slate-500 text-xs">{log.details}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit break-inside-avoid">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Compliance Status</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500" />
                <div>
                    <h4 className="text-sm font-semibold text-slate-800">Certificado Digital</h4>
                    <p className="text-xs text-slate-500">Válido até 12/2025 (A1)</p>
                </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className={`w-2 h-2 mt-2 rounded-full ${pendingObligations > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div>
                    <h4 className="text-sm font-semibold text-slate-800">Regularidade Fiscal</h4>
                    <p className="text-xs text-slate-500">{pendingObligations > 0 ? `${pendingObligations} obrigações pendentes` : 'Sem pendências na RFB'}</p>
                </div>
            </div>

             <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                <div>
                    <h4 className="text-sm font-semibold text-slate-800">Regime Tributário</h4>
                    <p className="text-xs text-slate-500">{company.regime}</p>
                </div>
            </div>
          </div>
          <button className="w-full mt-4 text-sm text-blue-600 font-medium hover:text-blue-700 no-print">Ver relatório detalhado</button>
        </div>
      </div>
    </div>
  );
};