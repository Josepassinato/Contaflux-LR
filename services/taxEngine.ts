import { FinancialData, FiscalDocument, TaxCalculationResult, RegimeComparison, InvoiceItem } from "../types";
import { taxRules } from './rulesEngine'; // Importa o novo motor de regras

// CSTs que geram direito a crédito (Entradas) - Lei 10.833/03 e 10.637/02
export const CREDIT_CSTS = ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66'];


const _calculatePisCofins = (documents: FiscalDocument[], rules: any) => {
    let pisDebits = 0;
    let cofinsDebits = 0;
    let pisCredits = 0;
    let cofinsCredits = 0;

    documents.forEach(doc => {
        if (doc.status !== 'classified') return;
        
        doc.items.forEach(item => {
            if (doc.operation_type === 'exit') {
                // Aplica alíquota de saída do motor de regras
                pisDebits += item.amount * rules.pisCofins.pisRate;
                cofinsDebits += item.amount * rules.pisCofins.cofinsRate;
            } else if (doc.operation_type === 'entry') {
                const cst = item.cstPis || item.cstCofins || '99';
                if (rules.pisCofins.creditCsts.includes(cst)) {
                    pisCredits += item.vPIS || (item.amount * rules.pisCofins.pisRate);
                    cofinsCredits += item.vCOFINS || (item.amount * rules.pisCofins.cofinsRate);
                }
            }
        });
    });

    return {
        pisDebits, cofinsDebits, pisCredits, cofinsCredits,
        pisPayable: Math.max(0, pisDebits - pisCredits),
        cofinsPayable: Math.max(0, cofinsDebits - cofinsCredits)
    };
};

const _calculateIrpjCsll = (financialData: FinancialData, rules: any) => {
    const netProfit = financialData.grossRevenue - financialData.operatingExpenses;
    const realProfit = netProfit + financialData.additions - financialData.exclusions;

    let offset = 0;
    if (realProfit > 0 && financialData.priorLosses > 0) {
        const limit = realProfit * rules.irpjCsll.lossOffsetLimit;
        offset = Math.min(financialData.priorLosses, limit);
    }

    const taxableBase = Math.max(0, realProfit - offset);

    const irpjBaseRate = taxableBase * rules.irpjCsll.irpjRate;
    const additionalBase = taxableBase - (rules.irpjCsll.additionalThreshold * 3); // Trimestral
    const irpjSurtax = Math.max(0, additionalBase * rules.irpjCsll.additionalRate);
    
    const irpjTotal = irpjBaseRate + irpjSurtax;
    const csllTotal = taxableBase * rules.irpjCsll.csllRate;

    return {
        netProfit, realProfit, offset, taxableBase,
        irpjBaseRate, irpjSurtax, irpjTotal, csllTotal
    };
};

const _calculateIcms = (documents: FiscalDocument[], rules: any) => {
    let icmsDebits = 0;
    let icmsCredits = 0;

    documents.forEach(doc => {
        if (doc.status !== 'classified') return;

        doc.items.forEach(item => {
            if (doc.operation_type === 'exit') {
                icmsDebits += item.vICMS || 0;
            } else if (doc.operation_type === 'entry') {
                // Simplificação: Assume que todo ICMS destacado na entrada é creditável.
                // Regras mais complexas (ex: uso e consumo) seriam tratadas no rulesEngine.
                icmsCredits += item.vICMS || 0;
            }
        });
    });

    const icmsBalance = icmsDebits - icmsCredits;
    return { icmsDebits, icmsCredits, icmsBalance };
};


export const taxEngine = {
    /**
     * Calcula estimativa de Lucro Presumido para fins de comparação
     */
    calculatePresumido: (grossRevenue: number, documents: FiscalDocument[]): { 
        totalTax: number, pis: number, cofins: number, irpj: number, csll: number 
    } => {
        let revenueServices = 0;
        let revenueCommerce = 0;

        if (documents.filter(d => d.operation_type === 'exit').length === 0) {
            revenueCommerce = grossRevenue; 
        } else {
            documents.filter(d => d.operation_type === 'exit').forEach(doc => {
                let isService = doc.items?.some(item => item.cfop.startsWith('5933') || item.cfop.startsWith('6933'));
                if (isService) revenueServices += doc.amount; else revenueCommerce += doc.amount;
            });
            const totalDocs = revenueCommerce + revenueServices;
            if (grossRevenue > totalDocs && totalDocs > 0) {
                const ratio = grossRevenue / totalDocs;
                revenueCommerce *= ratio;
                revenueServices *= ratio;
            } else if (totalDocs === 0) {
                revenueCommerce = grossRevenue;
            }
        }

        const pis = grossRevenue * 0.0065;
        const cofins = grossRevenue * 0.03;
        const baseIrpj = (revenueCommerce * 0.08) + (revenueServices * 0.32);
        const irpjBase = baseIrpj * 0.15;
        const irpjAdicional = Math.max(0, (baseIrpj - 60000) * 0.10);
        const irpj = irpjBase + irpjAdicional;
        const baseCsll = (revenueCommerce * 0.12) + (revenueServices * 0.32);
        const csll = baseCsll * 0.09;

        return { totalTax: pis + cofins + irpj + csll, pis, cofins, irpj, csll };
    },

    /**
     * Orquestrador principal que calcula todos os impostos.
     */
    calculate: (financialData: FinancialData, documents: FiscalDocument[], company: any): TaxCalculationResult => {
        const rules = taxRules.getApplicableRules(company);

        // Módulos de Cálculo
        const pisCofinsResult = _calculatePisCofins(documents, rules);
        const irpjCsllResult = _calculateIrpjCsll(financialData, rules);
        const icmsResult = _calculateIcms(documents, rules);
        
        const totalTax = irpjCsllResult.irpjTotal + irpjCsllResult.csllTotal + pisCofinsResult.pisPayable + pisCofinsResult.cofinsPayable;
        const effectiveRate = financialData.grossRevenue > 0 ? (totalTax / financialData.grossRevenue) * 100 : 0;

        // Comparativo (Planejamento Tributário)
        const presumido = taxEngine.calculatePresumido(financialData.grossRevenue, documents);
        const effectiveRatePresumido = financialData.grossRevenue > 0 ? (presumido.totalTax / financialData.grossRevenue) * 100 : 0;
        
        const comparison: RegimeComparison = {
            presumido: { ...presumido, effectiveRate: effectiveRatePresumido },
            real: { totalTax, effectiveRate },
            bestRegime: totalTax < presumido.totalTax ? 'Lucro Real' : 'Lucro Presumido',
            savings: Math.abs(totalTax - presumido.totalTax)
        };

        return {
            realProfit: irpjCsllResult.taxableBase,
            basis: irpjCsllResult.realProfit,
            offset: irpjCsllResult.offset,
            irpj: irpjCsllResult.irpjBaseRate,
            irpjAdicional: irpjCsllResult.irpjSurtax,
            csll: irpjCsllResult.csllTotal,
            pis: pisCofinsResult.pisPayable,
            pisDebits: pisCofinsResult.pisDebits,
            pisCredits: pisCofinsResult.pisCredits,
            cofins: pisCofinsResult.cofinsPayable,
            cofinsDebits: pisCofinsResult.cofinsDebits,
            cofinsCredits: pisCofinsResult.cofinsCredits,
            icmsDebits: icmsResult.icmsDebits,
            icmsCredits: icmsResult.icmsCredits,
            icmsBalance: icmsResult.icmsBalance,
            totalTax,
            effectiveRate,
            analysis: '', 
            comparison
        };
    }
};