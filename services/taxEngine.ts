
import { FinancialData, FiscalDocument, TaxCalculationResult, RegimeComparison } from "../types";

// CSTs que geram direito a crédito (Entradas) - Lei 10.833/03 e 10.637/02
// Exported for UI validation in Documents page
export const CREDIT_CSTS = ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66'];

export const taxEngine = {
    /**
     * Calcula estimativa de Lucro Presumido para fins de comparação
     */
    calculatePresumido: (grossRevenue: number, documents: FiscalDocument[]): { 
        totalTax: number, pis: number, cofins: number, irpj: number, csll: number 
    } => {
        // Separação de Receitas (Comércio/Indústria vs Serviços) baseada em CFOP
        // Simplificação: 51xx/54xx = Comércio, 5933/5949 = Serviços (aproximado para MVP)
        let revenueServices = 0;
        let revenueCommerce = 0;

        // Se não houver documentos classificados, assume tudo como Comércio (mais comum) ou divide
        if (documents.filter(d => d.operation_type === 'exit').length === 0) {
            revenueCommerce = grossRevenue; 
        } else {
            // Itera sobre documentos de saída para classificar receita
            documents.filter(d => d.operation_type === 'exit').forEach(doc => {
                let isService = false;
                doc.items?.forEach(item => {
                    // CFOPs de Serviço (Prestação de serviço tributado pelo ISSQN ou ICMS)
                    if (item.cfop.startsWith('5933') || item.cfop.startsWith('6933')) {
                        isService = true;
                    }
                });
                
                if (isService) {
                    revenueServices += doc.amount;
                } else {
                    revenueCommerce += doc.amount;
                }
            });
            
            // Ajuste caso o input manual seja maior que a soma dos docs (usuário digitou extra)
            const totalDocs = revenueCommerce + revenueServices;
            if (grossRevenue > totalDocs && totalDocs > 0) {
                const ratio = grossRevenue / totalDocs;
                revenueCommerce *= ratio;
                revenueServices *= ratio;
            } else if (totalDocs === 0) {
                revenueCommerce = grossRevenue;
            }
        }

        // 1. PIS (0.65%) e COFINS (3.00%) - Cumulativo
        const pis = grossRevenue * 0.0065;
        const cofins = grossRevenue * 0.03;

        // 2. IRPJ (Presunção: 8% Comércio, 32% Serviços)
        const baseIrpj = (revenueCommerce * 0.08) + (revenueServices * 0.32);
        const irpjBase = baseIrpj * 0.15;
        const irpjAdicional = Math.max(0, (baseIrpj - 60000) * 0.10); // Trimestral
        const irpj = irpjBase + irpjAdicional;

        // 3. CSLL (Presunção: 12% Comércio, 32% Serviços)
        const baseCsll = (revenueCommerce * 0.12) + (revenueServices * 0.32);
        const csll = baseCsll * 0.09;

        return {
            totalTax: pis + cofins + irpj + csll,
            pis,
            cofins,
            irpj,
            csll
        };
    },

    /**
     * Calcula os impostos de forma determinística baseada na Lei (Lucro Real Trimestral)
     */
    calculate: (financialData: FinancialData, documents: FiscalDocument[]): TaxCalculationResult => {
        // 1. Apuração de PIS/COFINS (Não-Cumulativo)
        let pisDebits = 0;
        let cofinsDebits = 0;
        let pisCredits = 0;
        let cofinsCredits = 0;

        documents.forEach(doc => {
            if (doc.status !== 'classified') return;

            // Se for Saída (Receita), soma Débitos
            if (doc.operation_type === 'exit') {
                // Soma os valores de PIS/COFINS destacados na nota
                // Para maior precisão, usamos o somatório dos itens já mapeados
                doc.items.forEach(item => {
                   pisDebits += item.vPIS || 0;
                   cofinsDebits += item.vCOFINS || 0;
                });
            } 
            // Se for Entrada (Despesa/Insumo), verifica direito a crédito
            else if (doc.operation_type === 'entry') {
                doc.items.forEach(item => {
                    // Verifica CST do PIS/COFINS
                    const cst = item.cstPis || item.cstCofins || '99';
                    
                    if (CREDIT_CSTS.includes(cst)) {
                        pisCredits += item.vPIS || 0;
                        cofinsCredits += item.vCOFINS || 0;
                    }
                });
            }
        });

        const pisPayable = Math.max(0, pisDebits - pisCredits);
        const cofinsPayable = Math.max(0, cofinsDebits - cofinsCredits);

        // 2. Apuração IRPJ e CSLL (Lucro Real)
        
        // Lucro Líquido Antes do IR
        const netProfit = financialData.grossRevenue - financialData.operatingExpenses;
        
        // Lucro Real (LALUR)
        // Lucro Líquido + Adições - Exclusões
        let realProfit = netProfit + financialData.additions - financialData.exclusions;

        // Compensação de Prejuízo Fiscal (Trava de 30%)
        let offset = 0;
        if (realProfit > 0 && financialData.priorLosses > 0) {
            const limit = realProfit * 0.30;
            offset = Math.min(financialData.priorLosses, limit);
        }

        const taxableBase = Math.max(0, realProfit - offset);

        // IRPJ: 15% Base + 10% Adicional sobre excedente de 60k (Trimestral)
        // *Assumindo apuração Trimestral para este MVP*
        const irpjBaseRate = taxableBase * 0.15;
        const irpjSurtax = Math.max(0, (taxableBase - 60000) * 0.10);
        const irpjTotal = irpjBaseRate + irpjSurtax;

        // CSLL: 9%
        const csllTotal = taxableBase * 0.09;

        const totalTax = irpjTotal + csllTotal + pisPayable + cofinsPayable;
        const effectiveRate = financialData.grossRevenue > 0 
            ? (totalTax / financialData.grossRevenue) * 100 
            : 0;

        // 3. Comparativo (Planejamento Tributário)
        const presumido = taxEngine.calculatePresumido(financialData.grossRevenue, documents);
        
        // Effective Rate Presumido
        const effectiveRatePresumido = financialData.grossRevenue > 0
            ? (presumido.totalTax / financialData.grossRevenue) * 100
            : 0;

        const comparison: RegimeComparison = {
            presumido: {
                ...presumido,
                effectiveRate: effectiveRatePresumido
            },
            real: {
                totalTax,
                effectiveRate
            },
            bestRegime: totalTax < presumido.totalTax ? 'Lucro Real' : 'Lucro Presumido',
            savings: Math.abs(totalTax - presumido.totalTax)
        };

        return {
            realProfit: taxableBase, // Base Tributável Final
            basis: realProfit, // Lucro Real antes da comp
            offset: offset,
            irpj: irpjBaseRate,
            irpjAdicional: irpjSurtax,
            csll: csllTotal,
            pis: pisPayable,
            pisDebits,
            pisCredits,
            cofins: cofinsPayable,
            cofinsDebits,
            cofinsCredits,
            totalTax,
            effectiveRate,
            analysis: '', // Será preenchido pela IA posteriormente
            comparison
        };
    }
};
