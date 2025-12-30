import React, { useState } from 'react';
// FIX: Added CompaniesProps import to resolve type error.
import { Company, AuthenticatedUser, CompaniesProps, ERPType } from '../types';
import { Building2, Edit, Trash2, CheckCircle, AlertTriangle, PlusCircle, X, Loader2, Lock, Link } from 'lucide-react';
import { companyService } from '../services/supabaseClient';

export const Companies: React.FC<CompaniesProps> = ({ companies, onRefresh, onSelectCompany, selectedCompanyId, user }) => {
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [formData, setFormData] = useState<Partial<Company>>({});
    const [reason, setReason] = useState(''); // State for justification

    const handleEditClick = (company: Company) => {
        setEditingCompany(company);
        setFormData({ 
            name: company.name, 
            cnpj: company.cnpj, 
            regime: company.regime,
            cnae_principal: company.cnae_principal || '',
            tax_profile: company.tax_profile || { isMonofasico: false },
            erp_integration: company.erp_integration || { type: 'ContaAzul', status: 'disconnected' }
        });
        setReason(''); // Reset reason on open
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
        if (!editingCompany || !user) return;
        
        if (!reason) {
            alert("A justificativa da alteração é obrigatória.");
            return;
        }

        setIsProcessing(true);
        try {
            await companyService.update(editingCompany.id, {
                name: formData.name,
                cnpj: formData.cnpj,
                cnae_principal: formData.cnae_principal,
                tax_profile: formData.tax_profile,
                erp_integration: formData.erp_integration
            }, user, reason); // Pass user and reason for audit
            
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

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[600px]">
                        {/* FIX: Implemented table headers. */}
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Empresa</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">CNPJ</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">ERP</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* FIX: Implemented table rows with company data and actions. */}
                            {companies.map((company) => (
                                <tr key={company.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedCompanyId === company.id ? 'bg-blue-50' : ''}`} onClick={() => onSelectCompany(company.id)}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{company.name}</div>
                                        <div className="text-xs text-slate-400">{company.regime}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-500 font-mono text-sm">{company.cnpj}</div>
                                    </td>
                                     <td className="px-6 py-4">
                                        {company.erp_integration?.type ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Link size={14} className="text-blue-500" />
                                                {company.erp_integration.type}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Não integrado</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {company.status === 'active' && <CheckCircle size={16} className="text-emerald-500" />}
                                            {company.status === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                                            <span className="capitalize">{company.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditClick(company); }}
                                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Editar Empresa"
                                                disabled={user.role === 'employee'}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(company.id, company.name); }}
                                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Excluir Empresa"
                                                disabled={user.role !== 'admin'}
                                            >
                                                <Trash2 size={16} />
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <Edit size={18} /> Editar Empresa
                            </h3>
                            <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* FIX: Implemented form fields for company data. */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={formData.cnpj || ''}
                                        onChange={e => setFormData({...formData, cnpj: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CNAE Principal</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={formData.cnae_principal || ''}
                                        onChange={e => setFormData({...formData, cnae_principal: e.target.value})}
                                    />
                                </div>
                            </div>
                             <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                <input 
                                    type="checkbox"
                                    id="isMonofasico"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={!!formData.tax_profile?.isMonofasico}
                                    onChange={e => setFormData({...formData, tax_profile: { ...formData.tax_profile, isMonofasico: e.target.checked }})}
                                />
                                <label htmlFor="isMonofasico" className="text-sm text-slate-700">Empresa com produtos em regime Monofásico de PIS/COFINS</label>
                            </div>
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Integração ERP</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                    value={formData.erp_integration?.type || ''}
                                    onChange={e => setFormData({...formData, erp_integration: { ...formData.erp_integration, type: e.target.value as ERPType, status: formData.erp_integration?.status || 'disconnected' }})}
                                >
                                    <option value="">Nenhuma</option>
                                    <option value="ContaAzul">Conta Azul</option>
                                    <option value="Bling">Bling</option>
                                    <option value="Omie">Omie</option>
                                    <option value="Tiny">Tiny</option>
                                </select>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Justificativa da Alteração <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Ex: Correção de CNPJ"
                                />
                                <p className="text-xs text-slate-400 mt-1">Esta informação é obrigatória e será registrada na trilha de auditoria.</p>
                            </div>

                            <button 
                                onClick={handleSave}
                                disabled={isProcessing}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-70 mt-4"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Salvar e Registrar Auditoria'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};