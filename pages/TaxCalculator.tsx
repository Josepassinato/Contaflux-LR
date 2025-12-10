import React, { useState } from 'react';
import { FinancialData, TaxCalculationResult, CalculationStatus, FiscalDocument, InvestmentSuggestion, Company } from '../types';
import { functions } from '../services/supabaseClient';
import { Calculator, Bot, FileCheck, AlertCircle, Loader2, ArrowRight, Search, TrendingDown, TrendingUp, BarChart3, PieChart, CheckCircle2 } from 'lucide-react';
import { BenefitRadar } from '../components/BenefitRadar';

interface TaxCalculatorProps {
    companyDocuments: FiscalDocument[];
    onCalculateLog?: (msg: string) => void;
    company: Company;
    isDemoMode: boolean;
}

export const TaxCalculator: React.FC<TaxCalculatorProps> = ({ companyDocuments, onCalculateLog, company, isDemoMode }) => {
  const [formData, setFormData] = useState<FinancialData>({
    grossRevenue: 0,
    operatingExpenses: 0,
    additions: 0,
    exclusions: 0,
    priorLosses: 0,
  });

  const [activeTab, setActiveTab] = useState<'details' | 'planning'>('details');
  const [calculationMemory, setCalculationMemory] = useState<string[]>([]);
  const [status, setStatus] = useState<CalculationStatus>(CalculationStatus.IDLE);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [radarSuggestions, setRadarSuggestions] = useState<InvestmentSuggestion[]>([]);
  const [isRadarLoading, setIsRadarLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleImportFromDocuments = () => {
    const memory: string[] = [];
    const exitDocs = companyDocuments.filter(d => d.operation_type === 'exit' && d.status === 'classified');
    const totalRevenue = exitDocs.reduce((sum, doc) => sum + doc.amount, 0);
    memory.push(`🔹 RECEITA BRUTA (SAÍDAS)`);
    memory.push(`Total consolidado: R$ ${totalRevenue.toFixed(2)} (${exitDocs.length} docs)`);

    const entryDocs = companyDocuments.filter(d => d.operation_type === 'entry' && d.status === 'classified');
    const totalEntry = entryDocs.reduce((sum, doc) => sum + doc.amount, 0);
    memory.push(`🔹 ENTRADAS TOTAIS`);
    memory.push(`R$ ${totalEntry.toFixed(2)} (Crédito por CST)`);

    setCalculationMemory(memory);
    setFormData(prev => ({ ...prev, grossRevenue: totalRevenue, operatingExpenses: totalEntry }));
    if(onCalculateLog) onCalculateLog(`Importação de dados fiscais. Receita: ${totalRevenue.toFixed(2)}`);
  };

  const handleCalculate = async () => {
    setStatus(CalculationStatus.PROCESSING);
    setError(null);
    setRadarSuggestions([]);

    try {
      const payload = { financialData: formData, documents: companyDocuments, company };
      
      const calculatedResult = await functions.invokeTaxCalculator(payload, isDemoMode);
      setResult(calculatedResult);

      setIsRadarLoading(true);
      
      const [auditAnalysis, suggestions] = await Promise.all([
          functions.invokeGeminiAuditor(calculatedResult, isDemoMode, company),
          functions.invokeBenefitRadar(calculatedResult, isDemoMode)
      ]);
      
      setResult(prev => prev ? { ...prev, analysis: auditAnalysis } : calculatedResult);
      setRadarSuggestions(suggestions);
      setIsRadarLoading(false);
      
      setStatus(CalculationStatus.COMPLETED);
      
      if(onCalculateLog) {
          const logMsg = `Apuração Finalizada. Receita: R$ ${formData.grossRevenue.toFixed(2)} | DARF Total: R$ ${calculatedResult.totalTax.toFixed(2)}`;
          onCalculateLog(logMsg);
      }

    } catch (err) {
      setError("Erro no processo de apuração via backend.");
      setStatus(CalculationStatus.ERROR);
      setIsRadarLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="text-blue-600" />
            Apuração Lucro Real
          </h1>
          <p className="text-slate-500">BFF Arch: Motor Fiscal seguro no Backend.</p>
        </div>
        {status === CalculationStatus.COMPLETED && (
            <div className="flex bg-slate-100 p-1 rounded-lg self-start">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'details' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2"><BarChart3 size={16} /> Detalhado</div>
                </button>
                <button 
                    onClick={() => setActiveTab('planning')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'planning' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                     <div className="flex items-center gap-2"><PieChart size={16} /> Planejamento</div>
                </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
             <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-bold text-indigo-900">Integração Contábil</h4>
                <span className="bg-indigo-200 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold">SUPABASE</span>
             </div>
             <p className="text-xs text-indigo-700 mb-3">
                 {companyDocuments.length} documentos carregados.<br/>
                 O motor cruzará CSTs (50-66) para apurar créditos de PIS/COFINS.
             </p>
             <button 
                onClick={handleImportFromDocuments}
                disabled={companyDocuments.length === 0}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                 <ArrowRight size={14} /> Importar Valores
             </button>
             
             {calculationMemory.length > 0 && (
                 <div className="mt-3 bg-white/60 p-3 rounded border border-indigo-100 max-h-48 overflow-y-auto custom-scrollbar">
                     <p className="text-[10px] font-bold text-indigo-900 mb-2 flex items-center gap-1">
                        <Search size={10} /> LOG DE IMPORTAÇÃO
                     </p>
                     <div className="space-y-1">
                        {calculationMemory.map((log, i) => (
                            <p key={i} className="text-[10px] font-mono text-indigo-800">
                                {log}
                            </p>
                        ))}
                     </div>
                 </div>
             )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Receita Bruta</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">R$</span>
                    <input type="number" name="grossRevenue" value={formData.grossRevenue} onChange={handleInputChange} className="pl-10 w-full rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Despesas Operacionais</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">R$</span>
                    <input type="number" name="operatingExpenses" value={formData.operatingExpenses} onChange={handleInputChange} className="pl-10 w-full rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                 <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">e-LALUR (Ajustes)</h4>
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Adições</label>
                        <input type="number" name="additions" value={formData.additions} onChange={handleInputChange} className="w-full p-2 text-sm rounded-lg border-slate-200" placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Exclusões</label>
                        <input type="number" name="exclusions" value={formData.exclusions} onChange={handleInputChange} className="w-full p-2 text-sm rounded-lg border-slate-200" placeholder="0.00" />
                    </div>
                 </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Prejuízo Fiscal Acumulado</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">R$</span>
                    <input type="number" name="priorLosses" value={formData.priorLosses} onChange={handleInputChange} className="pl-10 w-full rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Limite de compensação: 30% do Lucro Real</p>
              </div>

              <button 
                onClick={handleCalculate}
                disabled={status === CalculationStatus.PROCESSING}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 mt-6 shadow-lg shadow-blue-200"
              >
                {status === CalculationStatus.PROCESSING ? (
                    <>
                        <Loader2 className="animate-spin" size={20} /> Auditando no Backend...
                    </>
                ) : (
                    <>
                        <FileCheck size={20} /> Executar Apuração
                    </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2 space-y-8">
            {status === CalculationStatus.IDLE && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 bg-white rounded-xl border border-slate-100 border-dashed">
                    <Calculator size={48} className="mb-4 text-slate-200" />
                    <p>Aguardando execução do motor fiscal.</p>
                </div>
            )}

            {status === CalculationStatus.ERROR && (
                 <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                 </div>
            )}

            {(status === CalculationStatus.COMPLETED || status === CalculationStatus.PROCESSING) && result && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Header Resumo */}
                    <div className="bg-slate-900 rounded-xl text-white p-6 shadow-lg flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">DARF Consolidado</h2>
                            <p className="text-slate-400 text-sm">Competência Atual</p>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-sm text-slate-400 mb-1">Total a Recolher</p>
                            <p className="text-4xl font-bold text-emerald-400 tracking-tight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.totalTax)}
                            </p>
                        </div>
                    </div>

                    {/* Content Based on Tab */}
                    {activeTab === 'details' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">IR</div>
                                        <h3 className="font-bold text-slate-800">IRPJ & CSLL</h3>
                                    </div>
                                    
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Lucro Líquido</span>
                                            <span className="font-medium">R$ {(formData.grossRevenue - formData.operatingExpenses).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 text-xs pl-2">
                                            <span>(+) Adições / (-) Exclusões</span>
                                            <span>R$ {(formData.additions - formData.exclusions).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold bg-slate-50 p-2 rounded">
                                            <span>= Lucro Real</span>
                                            <span>R$ {result.basis.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-500 text-xs">
                                            <span>(-) Comp. Prejuízo (max 30%)</span>
                                            <span>(R$ {result.offset.toFixed(2)})</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-slate-600 font-medium">IRPJ (15% + 10%)</span>
                                                <span className="font-bold text-slate-800">R$ {(result.irpj + result.irpjAdicional).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600 font-medium">CSLL (9%)</span>
                                                <span className="font-bold text-slate-800">R$ {result.csll.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">PC</div>
                                        <h3 className="font-bold text-slate-800">PIS & COFINS</h3>
                                        <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Não-Cumulativo</span>
                                    </div>

                                    <div className="space-y-4 text-sm">
                                        {/* PIS */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="font-semibold text-slate-700">PIS</span>
                                                <span className="font-bold text-slate-800">R$ {result.pis.toFixed(2)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-red-50 p-2 rounded text-red-700 flex flex-col">
                                                    <span className="flex items-center gap-1"><TrendingUp size={10} /> Débitos</span>
                                                    <span className="font-bold">R$ {result.pisDebits.toFixed(2)}</span>
                                                </div>
                                                <div className="bg-emerald-50 p-2 rounded text-emerald-700 flex flex-col">
                                                    <span className="flex items-center gap-1"><TrendingDown size={10} /> Créditos</span>
                                                    <span className="font-bold">R$ {result.pisCredits.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* COFINS */}
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-semibold text-slate-700">COFINS</span>
                                                <span className="font-bold text-slate-800">R$ {result.cofins.toFixed(2)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-red-50 p-2 rounded text-red-700 flex flex-col">
                                                    <span className="font-bold">R$ {result.cofinsDebits.toFixed(2)}</span>
                                                </div>
                                                <div className="bg-emerald-50 p-2 rounded text-emerald-700 flex flex-col">
                                                    <span className="font-bold">R$ {result.cofinsCredits.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RADAR DE BENEFÍCIOS FISCAIS */}
                            {isRadarLoading ? (
                                <div className="mt-8 p-8 border border-slate-200 border-dashed rounded-xl bg-slate-50 flex flex-col items-center justify-center animate-pulse">
                                    <Bot className="text-indigo-400 mb-3" size={32} />
                                    <h3 className="text-slate-600 font-semibold">Analisando oportunidades de elisão fiscal...</h3>
                                    <p className="text-slate-400 text-sm">O Consultor IA está varrendo a legislação (Lei do Bem, RIR).</p>
                                </div>
                            ) : radarSuggestions.length > 0 && (
                                <BenefitRadar 
                                    suggestions={radarSuggestions} 
                                    currentProfit={result.realProfit} 
                                    currentTax={result.totalTax} 
                                />
                            )}

                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-fade-in">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TrendingUp className="text-blue-600" size={20} />
                                Planejamento Tributário: Real vs Presumido
                            </h3>
                            
                            {result.comparison && (
                                <div className="space-y-6">
                                    <div className={`p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                        result.comparison.bestRegime === 'Lucro Real' 
                                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                                        : 'bg-amber-50 text-amber-900 border border-amber-100'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 size={24} className={result.comparison.bestRegime === 'Lucro Real' ? 'text-emerald-600' : 'text-amber-600'} />
                                            <div>
                                                <p className="text-sm font-semibold opacity-80">Melhor Regime Sugerido</p>
                                                <p className="text-xl font-bold">{result.comparison.bestRegime}</p>
                                            </div>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <p className="text-sm font-semibold opacity-80">Economia Estimada</p>
                                            <p className="text-xl font-bold">R$ {result.comparison.savings.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Card Lucro Real */}
                                        <div className={`p-4 rounded-lg border-2 transition-all ${result.comparison.bestRegime === 'Lucro Real' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-slate-50 opacity-75'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-slate-700">Lucro Real</h4>
                                                {result.comparison.bestRegime === 'Lucro Real' && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">RECOMENDADO</span>}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Total Impostos:</span>
                                                    <span className="font-bold">R$ {result.comparison.real.totalTax.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Carga Efetiva:</span>
                                                    <span className="font-bold">{result.comparison.real.effectiveRate.toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Lucro Presumido */}
                                        <div className={`p-4 rounded-lg border-2 transition-all ${result.comparison.bestRegime === 'Lucro Presumido' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-100 bg-slate-50 opacity-75'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-slate-700">Lucro Presumido</h4>
                                                {result.comparison.bestRegime === 'Lucro Presumido' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">RECOMENDADO</span>}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Total Impostos:</span>
                                                    <span className="font-bold">R$ {result.comparison.presumido.totalTax.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Carga Efetiva:</span>
                                                    <span className="font-bold">{result.comparison.presumido.effectiveRate.toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Visual Bar Comparison */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Comparativo de Custo</span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex relative">
                                            {/* We normalize to the larger value to show relative bars */}
                                            {(() => {
                                                const maxVal = Math.max(result.comparison.real.totalTax, result.comparison.presumido.totalTax);
                                                const realWidth = (result.comparison.real.totalTax / maxVal) * 100;
                                                
                                                return (
                                                    <div className="w-full relative h-full">
                                                        {/* Real Bar */}
                                                        <div 
                                                            className="absolute top-0 left-0 h-full bg-blue-500 opacity-80 transition-all duration-500" 
                                                            style={{ width: `${realWidth}%` }}
                                                            title="Lucro Real"
                                                        />
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            * Estimativa baseada em presunção padrão (8%/12% Comércio e 32% Serviços) para Lucro Presumido.
                                        </p>
                                    </div>

                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Auditor Analysis */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="text-indigo-600" size={20} />
                                <h3 className="font-bold text-indigo-900">Auditor Digital (IA)</h3>
                            </div>
                            {!result.analysis && <Loader2 className="animate-spin text-indigo-400" size={16} />}
                        </div>
                        <div className="p-6 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {result.analysis || "A IA está analisando a conformidade dos números calculados..."}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
