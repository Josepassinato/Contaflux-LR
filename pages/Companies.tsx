import React, { useState } from 'react';
import { Company } from '../types';
import { Building2, Edit, Trash2, CheckCircle, AlertTriangle, PlusCircle, X, Loader2, Lock } from 'lucide-react';
import { companyService } from '../services/supabaseClient';

interface CompaniesProps {
    companies: Company[];
    onRefresh: () => void;
    onSelectCompany: (id: string) => void;
    selectedCompanyId: string;
}

export const Companies: React.FC<CompaniesProps> = ({ companies, onRefresh, onSelectCompany, selectedCompanyId }) => {
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Form States
    const [formData, setFormData] = useState({ name: '', cnpj: '', regime: 'Lucro Real' });

    const handleEditClick = (company: Company) => {
        setEditingCompany(company);
        setFormData({ name: company.name, cnpj: company.cnpj, regime: company.regime });
    };

    const handleDeleteClick = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja remover a empresa "${name}"? Todos os documentos e dados fiscais serão perdidos permanentemente.`)) {
            return;
        }

        setIsProcessing(true);
        try {
            await companyService.delete(id);
            onRefresh();
        } catch (error) {
            alert("Erro ao excluir empresa.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!editingCompany) return;
        
        setIsProcessing(true);
        try {
            await companyService.update(editingCompany.id, {
                name: formData.name,
                cnpj: formData.cnpj,
                regime: 'Lucro Real' // Ensure Lucro Real is saved
            });
            setEditingCompany(null);
            onRefresh();
        } catch (error) {
            alert("Erro ao atualizar empresa.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-blue-600" />
                        Gestão Societária
                    </h1>
                    <p className="text-slate-500">Administração da carteira de empresas e regimes tributários.</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Empresa</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Regime</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {companies.map((company) => (
                                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${company.id === selectedCompanyId ? 'bg-blue-600' : 'bg-slate-400'}`}>
                                                {company.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className={`font-semibold ${company.id === selectedCompanyId ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    {company.name}
                                                    {company.id === selectedCompanyId && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">ATIVA</span>}
                                                </p>
                                                <p className="text-xs text-slate-400">{company.cnpj}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            company.regime === 'Lucro Real' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {company.regime}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                            <CheckCircle size={14} /> Ativo
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onSelectCompany(company.id)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Selecionar Empresa"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleEditClick(company)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Editar Dados"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(company.id, company.name)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir Empresa"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingCompany && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <Edit size={18} /> Editar Empresa
                            </h3>
                            <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Empresarial</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                    value={formData.cnpj}
                                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Regime Tributário</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                                        value="Lucro Real"
                                        disabled
                                    />
                                    <div className="absolute right-3 top-2.5 flex items-center gap-1 text-xs text-slate-400 font-bold">
                                        <Lock size={12} /> FIXO
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSave}
                                disabled={isProcessing}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-70"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};