import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { ShieldCheck, User, Calendar, Search, GitCommit, ArrowRight } from 'lucide-react';
import { auditLogService } from '../services/supabaseClient';

interface AuditTrailProps {
  companyId: string;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ companyId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const data = await auditLogService.list(companyId);
        setLogs(data);
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [companyId]);

  const filteredLogs = logs.filter(log => 
    log.user_name.toLowerCase().includes(filter.toLowerCase()) ||
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.target_entity.toLowerCase().includes(filter.toLowerCase())
  );
  
  const renderValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-slate-400 italic">Nulo</span>;
    if (typeof value === 'object') {
        const cleanValue = { ...value };
        delete cleanValue.id;
        delete cleanValue.created_at;
        delete cleanValue.updated_at;
        return <pre className="text-xs bg-slate-800 p-2 rounded overflow-auto">{JSON.stringify(cleanValue, null, 2)}</pre>
    }
    return String(value);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="text-blue-600" />
          Trilha de Auditoria (SOC 2-like)
        </h1>
        <p className="text-slate-500">Log imutável de todas as ações críticas executadas na plataforma.</p>
      </div>
      
      <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input 
              type="text"
              placeholder="Filtrar por ação, usuário ou entidade..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-6 space-y-6">
          {isLoading ? (
            <p className="text-center text-slate-500">Carregando logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center text-slate-500 italic">Nenhum registro de auditoria encontrado.</p>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 border-b border-slate-100 pb-4 last:border-b-0">
                {/* Meta Info */}
                <div className="md:col-span-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User size={14} /> <span className="font-medium">{log.user_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Calendar size={14} /> <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs pt-2">
                    <GitCommit size={14} /> 
                    <div>
                        <p className="font-mono bg-slate-100 px-2 py-0.5 rounded w-fit">{log.action}</p>
                        <p className="text-slate-400">{log.target_entity} / ID: ...{log.target_id.slice(-6)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Diff Viewer */}
                <div className="md:col-span-9 bg-slate-900 text-white rounded-lg p-4 font-mono text-xs overflow-hidden">
                    <p className="text-slate-400 mb-2">// Justificativa: <span className="text-slate-300 italic">"{log.reason}"</span></p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="overflow-auto custom-scrollbar">
                           <p className="text-red-400 mb-1">- old_value</p>
                           {renderValue(log.old_value)}
                        </div>
                        <div className="overflow-auto custom-scrollbar">
                           <p className="text-emerald-400 mb-1">+ new_value</p>
                           {renderValue(log.new_value)}
                        </div>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
