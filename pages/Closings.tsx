import React from 'react';
import { GitBranch, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { MonthlyClosing } from '../types';

// Mock data, to be replaced by props
const mockClosings: MonthlyClosing[] = [];

export const Closings: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <GitBranch className="text-blue-600" />
                    Histórico de Fechamentos
                </h1>
                <p className="text-slate-500">Registros imutáveis das apurações mensais executadas pelos pipelines.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                 <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[700px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Competência</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Receita Total</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Imposto Apurado</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {mockClosings.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400 italic">
                                        Nenhum fechamento automático executado ainda.
                                    </td>
                                </tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
