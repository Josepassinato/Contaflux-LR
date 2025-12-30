import React, { useState } from 'react';
import { BookMarked, Bot, Loader2, Send } from 'lucide-react';
// FIX: Import description objects directly as they are not properties of fiscalMapping.
import { CFOP_DESCRIPTIONS, CST_PIS_COFINS_DESCRIPTIONS } from '../services/fiscalMapping';
import { runMappingSuggestionAgent } from '../services/geminiService'; // Simulação de chamada local

export const MappingEditor: React.FC = () => {
    const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
    const [suggestedRule, setSuggestedRule] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSuggestion = async () => {
        if (!naturalLanguageInput) return;
        setIsLoading(true);
        setSuggestedRule('');
        try {
            const resultJson = await runMappingSuggestionAgent(naturalLanguageInput);
            setSuggestedRule(JSON.stringify(JSON.parse(resultJson), null, 2));
        } catch (error) {
            console.error(error);
            setSuggestedRule("Erro ao gerar sugestão. Verifique o formato da sua solicitação.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <BookMarked className="text-blue-600" />
                    Editor de Mapeamento Fiscal
                </h1>
                <p className="text-slate-500">Visualize e personalize as regras de negócio do motor fiscal.</p>
            </div>

            {/* AI Assistant for Rule Creation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center gap-3">
                    <Bot size={20} className="text-indigo-600" />
                    <div>
                        <h2 className="font-bold text-indigo-900">Assistente de Regras (IA)</h2>
                        <p className="text-xs text-indigo-700">Descreva uma regra em linguagem natural e a IA irá traduzir para o formato do sistema.</p>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Input */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Sua Solicitação:</label>
                            <textarea
                                value={naturalLanguageInput}
                                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                                placeholder="Ex: Classificar todas as despesas com 'energia elétrica' como insumo para crédito de PIS/COFINS"
                                className="w-full mt-2 p-3 border border-slate-200 rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSuggestion}
                                disabled={isLoading}
                                className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <Send size={16} />}
                                Gerar Sugestão
                            </button>
                        </div>

                        {/* Output */}
                        <div>
                             <label className="text-sm font-medium text-slate-700">Sugestão da IA (JSON):</label>
                             <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg h-44 overflow-y-auto custom-scrollbar font-mono text-xs">
                                <pre>{suggestedRule || 'Aguardando sua solicitação...'}</pre>
                             </div>
                             {suggestedRule && !suggestedRule.includes('Erro') && (
                                <button className="mt-3 w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700">
                                    Aprovar e Adicionar Regra
                                </button>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Rule Viewer */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="p-4 border-b">
                    <h2 className="font-semibold text-slate-700">Base de Conhecimento Fiscal Atual</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CFOP Table */}
                    <div>
                        <h3 className="font-medium mb-2">CFOPs Mapeados</h3>
                        <div className="h-64 overflow-y-auto border rounded-lg custom-scrollbar">
                           <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-100"><tr><th className="p-2 text-left">Código</th><th className="p-2 text-left">Descrição</th></tr></thead>
                                <tbody>
                                    {/* FIX: Use the imported CFOP_DESCRIPTIONS object directly. */}
                                    {Object.entries(CFOP_DESCRIPTIONS).map(([code, desc]) => (
                                        <tr key={code} className="border-t">
                                            <td className="p-2 font-mono">{code}</td>
                                            <td className="p-2">{desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                    </div>
                    {/* CST Table */}
                     <div>
                        <h3 className="font-medium mb-2">CSTs (PIS/COFINS) Mapeados</h3>
                        <div className="h-64 overflow-y-auto border rounded-lg custom-scrollbar">
                           <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-100"><tr><th className="p-2 text-left">Código</th><th className="p-2 text-left">Descrição</th></tr></thead>
                                <tbody>
                                    {/* FIX: Use the imported CST_PIS_COFINS_DESCRIPTIONS object directly. */}
                                    {Object.entries(CST_PIS_COFINS_DESCRIPTIONS).map(([code, desc]) => (
                                        <tr key={code} className="border-t">
                                            <td className="p-2 font-mono">{code}</td>
                                            <td className="p-2">{desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};