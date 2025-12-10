import React, { useState } from 'react';
import { InvestmentSuggestion } from '../types';
import { Bot, Zap, TrendingDown, BookOpen, Plus, Check, BrainCircuit, Lightbulb, ArrowRight, DollarSign, Sparkles } from 'lucide-react';

interface BenefitRadarProps {
  suggestions: InvestmentSuggestion[];
  currentProfit: number;
  currentTax: number;
}

export const BenefitRadar: React.FC<BenefitRadarProps> = ({ suggestions, currentProfit, currentTax }) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Calculate Simulations
  const totalInvestment = suggestions
    .filter(s => selectedItems.includes(s.id))
    .reduce((acc, s) => acc + s.suggestedAmount, 0);

  const totalSavings = suggestions
    .filter(s => selectedItems.includes(s.id))
    .reduce((acc, s) => acc + s.estimatedTaxSaving, 0);

  const projectedTax = currentTax - totalSavings;

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'innovation': return <BrainCircuit className="text-purple-600" size={24} />;
      case 'training': return <BookOpen className="text-blue-600" size={24} />;
      case 'software': return <Zap className="text-amber-500" size={24} />;
      case 'marketing': return <Sparkles className="text-pink-500" size={24} />;
      default: return <Lightbulb className="text-slate-600" size={24} />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-xl overflow-hidden text-white mt-8 border border-slate-700">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                <Bot size={24} className="text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                    Radar de Benefícios Fiscais
                </h2>
                <p className="text-slate-400 text-sm">IA Estratégica: Transforme Impostos em Reinvestimento.</p>
            </div>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Lucro Real Base</p>
            <p className="text-xl font-mono font-bold text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentProfit)}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Left: Simulation Area */}
          <div className="col-span-2 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Oportunidades Detectadas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => toggleSelection(item.id)}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${
                            selectedItems.includes(item.id) 
                            ? 'border-emerald-500 bg-emerald-500/10' 
                            : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                          {selectedItems.includes(item.id) && (
                              <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in">
                                  <Check size={12} />
                              </div>
                          )}

                          <div className="flex items-start gap-3 mb-3">
                              <div className={`p-2 rounded-lg bg-slate-900 border border-slate-700`}>
                                  {getIcon(item.category)}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-100 text-sm">{item.title}</h4>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">{item.legalBasis}</span>
                              </div>
                          </div>
                          
                          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                              {item.description}
                          </p>

                          <div className="flex justify-between items-end border-t border-slate-700/50 pt-3">
                              <div>
                                  <p className="text-[10px] text-slate-500 uppercase">Investimento</p>
                                  <p className="font-bold text-slate-200 text-sm">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.suggestedAmount)}
                                  </p>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-emerald-400 uppercase flex items-center justify-end gap-1">
                                      <TrendingDown size={10} /> Economia Fiscal
                                  </p>
                                  <p className="font-bold text-emerald-400 text-sm">
                                      - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.estimatedTaxSaving)}
                                  </p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Right: Impact Panel */}
          <div className="bg-slate-950/50 border-l border-slate-700 p-6 flex flex-col justify-between relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-10" />

              <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-6 flex items-center gap-2">
                      <TrendingDown className="text-emerald-400" size={18} />
                      Simulador de Impacto
                  </h3>

                  <div className="space-y-6">
                      <div className="relative">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Imposto Original</span>
                              <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentTax)}</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500 w-full" />
                          </div>
                      </div>

                      <div className="relative">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span className="text-emerald-400 font-bold">Novo Imposto Projetado</span>
                              <span className="text-white font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedTax)}</span>
                          </div>
                          <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative">
                              {/* Original Bar faded */}
                              <div className="absolute top-0 left-0 h-full bg-slate-600 w-full opacity-20" />
                              {/* New Bar */}
                              <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                style={{ width: `${(projectedTax / currentTax) * 100}%` }} 
                              />
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                      <p className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Economia Total Estimada</p>
                      <p className="text-3xl font-bold text-emerald-400 tracking-tight">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSavings)}
                      </p>
                      <p className="text-[10px] text-emerald-200/70 mt-2">
                          * Considerando alíquota efetiva de IRPJ/CSLL sobre despesa operacional.
                      </p>
                  </div>
              </div>

              <div className="mt-6">
                  {selectedItems.length > 0 ? (
                      <div className="space-y-3">
                         <div className="flex items-start gap-3 bg-blue-600/20 p-3 rounded-lg border border-blue-500/30">
                            <Bot className="text-blue-400 shrink-0 mt-1" size={16} />
                            <p className="text-xs text-blue-100 italic">
                                "Excelente estratégia. Ao reinvestir <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalInvestment)}</strong>, você transforma tributos em crescimento real para a empresa."
                            </p>
                         </div>
                         <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transition-all">
                             Adicionar ao Planejamento <ArrowRight size={18} />
                         </button>
                      </div>
                  ) : (
                      <div className="text-center text-slate-500 text-xs py-4">
                          Selecione os cards ao lado para simular.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};