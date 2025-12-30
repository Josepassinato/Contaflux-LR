import React, { useState } from 'react';
import { Link, Rss, Mail, Power, PowerOff, RefreshCw, Loader2 } from 'lucide-react';
import { Company, ERPType } from '../types';
import { companyService } from '../services/supabaseClient';
import { ERPService } from '../core/erp/ERPService';

interface IntegrationsProps {
    company: Company;
    onCompanyUpdate: () => void;
}

const erpOptions: { key: ERPType; name: string; logo: string; }[] = [
    { key: 'ContaAzul', name: 'Conta Azul', logo: 'https://cdn.contaazul.com/assets/images/logos/logo-symbol.svg' },
    { key: 'Bling', name: 'Bling!', logo: 'https://www.bling.com.br/imagens/front/bling_2.svg' },
    { key: 'Omie', name: 'Omie', logo: 'https://assets-global.website-files.com/5f85529948b8c828557859b1/5f85529948b8c823f9785a3c_omie-logo-2-colors-1.svg' },
    { key: 'Tiny', name: 'Tiny ERP', logo: 'https://tiny.com.br/images/logo/logo-tiny.svg' },
];

export const Integrations: React.FC<IntegrationsProps> = ({ company, onCompanyUpdate }) => {
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [syncLog, setSyncLog] = useState<string[]>([]);

    const handleConnect = async (erp: ERPType) => {
        setIsLoading(prev => ({...prev, [erp]: true}));
        // Simulate OAuth flow & update company record
        await new Promise(res => setTimeout(res, 1500));
        await companyService.update(company.id, {
            erp_integration: { type: erp, status: 'connected', last_sync: new Date().toISOString() }
        }, {id: 'system', name: 'System', email: '', role: 'admin'}, `Connected to ${erp} ERP`);
        onCompanyUpdate();
        setIsLoading(prev => ({...prev, [erp]: false}));
    };

    const handleDisconnect = async (erp: ERPType) => {
        setIsLoading(prev => ({...prev, [erp]: true}));
        await new Promise(res => setTimeout(res, 500));
        await companyService.update(company.id, {
            erp_integration: { type: erp, status: 'disconnected' }
        }, {id: 'system', name: 'System', email: '', role: 'admin'}, `Disconnected from ${erp} ERP`);
        onCompanyUpdate();
        setIsLoading(prev => ({...prev, [erp]: false}));
    };

    const handleSync = async () => {
        if (!company.erp_integration) return;
        const erpType = company.erp_integration.type;
        
        setIsLoading(prev => ({...prev, sync: true}));
        setSyncLog(['[SYNC STARTED] Initializing ERP Service...']);

        try {
            const service = new ERPService(erpType);
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() -1, 1);
            
            const startDate = lastMonth.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];
            
            setSyncLog(prev => [...prev, `[FETCH] Requesting data from ${startDate} to ${endDate}`]);

            const result = await service.syncPeriod(company, startDate, endDate);
            
            setSyncLog(prev => [...prev, `[NORMALIZE] Normalization pipeline finished.`]);
            setSyncLog(prev => [...prev, `[SAVE] ${result.addedCount} new documents saved.`]);
            setSyncLog(prev => [...prev, `[SUCCESS] ${result.message}`]);
            
            await companyService.update(company.id, {
                erp_integration: { ...company.erp_integration, status: 'connected', last_sync: new Date().toISOString() }
            }, {id: 'system', name: 'System', email: '', role: 'admin'}, `Synced ${result.addedCount} documents from ${erpType}`);
            
            onCompanyUpdate();

        } catch (e) {
            setSyncLog(prev => [...prev, `[ERROR] ${(e as Error).message}`]);
        } finally {
            setIsLoading(prev => ({...prev, sync: false}));
        }
    };


    const currentIntegration = company?.erp_integration;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Link className="text-blue-600" />
                    Central de Integrações
                </h1>
                <p className="text-slate-500">Conecte seu ERP para automatizar a importação de documentos fiscais.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="font-semibold text-slate-600">ERPs Disponíveis</h2>
                    {erpOptions.map((erp) => {
                        const isConnected = currentIntegration?.type === erp.key && currentIntegration.status === 'connected';
                        const isSelectedButDisconnected = currentIntegration?.type === erp.key && currentIntegration.status !== 'connected';
                        const isSelected = currentIntegration?.type === erp.key;

                        return (
                            <div key={erp.key} className={`bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between transition-all ${isSelected ? 'border-blue-500' : 'border-slate-100 hover:border-slate-300'}`}>
                                <img src={erp.logo} alt={erp.name} className="h-8" />
                                {isConnected ? (
                                    <button onClick={() => handleDisconnect(erp.key)} disabled={isLoading[erp.key]} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50" title="Desconectar">
                                        {isLoading[erp.key] ? <Loader2 className="animate-spin" size={16} /> : <PowerOff size={16} />}
                                    </button>
                                ) : (
                                    <button onClick={() => handleConnect(erp.key)} disabled={isLoading[erp.key] || (currentIntegration && !isSelected)} className="p-2 text-emerald-500 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50" title={currentIntegration && !isSelected ? `Desconecte de ${currentIntegration.type} primeiro` : "Conectar"}>
                                        {isLoading[erp.key] ? <Loader2 className="animate-spin" size={16} /> : <Power size={16} />}
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="lg:col-span-2">
                     <h2 className="font-semibold text-slate-600 mb-4">Painel de Sincronização</h2>
                     {currentIntegration && currentIntegration.status === 'connected' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                            <div className="flex justify-between items-start">
                               <div>
                                    <p className="text-sm text-slate-500">Status</p>
                                    <div className="flex items-center gap-2 font-bold text-emerald-600">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        Conectado com {currentIntegration.type}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Última sinc.: {currentIntegration.last_sync ? new Date(currentIntegration.last_sync).toLocaleString('pt-BR') : 'Nunca'}</p>
                               </div>
                               <button onClick={handleSync} disabled={isLoading['sync']} className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60">
                                    {isLoading['sync'] ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                    Sincronizar Agora
                                </button>
                            </div>
                            {syncLog.length > 0 && (
                                <div className="mt-6 bg-slate-900 text-white font-mono text-xs rounded-lg p-4 h-64 overflow-y-auto custom-scrollbar">
                                    {syncLog.map((line, i) => (
                                        <p key={i} className={`whitespace-pre-wrap ${line.includes('[ERROR]') ? 'text-red-400' : line.includes('[SUCCESS]') ? 'text-emerald-400' : 'text-slate-300'}`}>
                                           <span className="text-slate-500 mr-2">{String(i+1).padStart(2, '0')}</span>{line}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                     ) : (
                         <div className="bg-white rounded-xl shadow-sm border border-slate-100 border-dashed p-12 text-center text-slate-500">
                            <Link size={32} className="mx-auto text-slate-300 mb-2"/>
                            <h3 className="font-medium">Nenhuma integração ativa.</h3>
                            <p className="text-sm">{currentIntegration ? `Sua integração com ${currentIntegration.type} está desconectada.` : 'Selecione um ERP e clique em "conectar" para começar.'}</p>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
};