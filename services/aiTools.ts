import { documentService } from './supabaseClient';
import { validatorService } from './validatorService';
import { mockDocuments } from './mockData'; // Usado para simulação no modo demo

/**
 * AI Toolbelt
 * This file contains the actual functions that the AI can decide to call.
 * Each function is a "tool" in the AI's arsenal.
 * These functions interact with our application's services (e.g., supabaseClient, validatorService).
 */

const tools = {
  /**
   * Busca todos os documentos fiscais de uma determinada competência (mês/ano).
   * @param competence A competência no formato 'MM/YYYY'.
   * @param companyId O ID da empresa.
   */
  getDocumentsByPeriod: async ({ competence, companyId }: { competence: string; companyId: string }) => {
    console.log(`[AI TOOL] Executing getDocumentsByPeriod for ${competence}...`);
    // Em um cenário real, usaríamos o documentService.
    // Para o modo demo, filtramos os mockDocuments.
    const [month, year] = competence.split('/');
    const datePrefix = `${year}-${month.padStart(2, '0')}`;
    
    // Simulating a real DB call or using mock data
    const documents = mockDocuments.filter(doc => doc.date.startsWith(datePrefix) && doc.company_id === companyId);
    
    if (documents.length === 0) {
      return JSON.stringify({ message: `Nenhum documento encontrado para a competência ${competence}.` });
    }
    
    // Retorna um resumo para não sobrecarregar o prompt
    const summary = documents.map(d => ({
      name: d.name,
      date: d.date,
      type: d.operation_type,
      amount: d.amount
    }));
    
    return JSON.stringify(summary);
  },

  /**
   * Executa o validador SPED ("PVA Lite") para uma empresa e competência.
   * @param competence A competência no formato 'MM/YYYY'.
   * @param companyId O ID da empresa.
   */
  runSpedValidationForCompany: async ({ competence, companyId }: { competence: string; companyId: string }) => {
    console.log(`[AI TOOL] Executing runSpedValidationForCompany for ${competence}...`);
    const [month, year] = competence.split('/');
    const datePrefix = `${year}-${month.padStart(2, '0')}`;

    const documents = mockDocuments.filter(doc => doc.date.startsWith(datePrefix) && doc.company_id === companyId);

    if (documents.length === 0) {
      return JSON.stringify({ message: `Não é possível validar: nenhum documento encontrado para ${competence}.` });
    }

    const issues = validatorService.validateSped(documents);

    if (issues.length === 0) {
      return JSON.stringify({ message: "Validação concluída com sucesso. Nenhuma inconsistência encontrada." });
    }

    return JSON.stringify(issues);
  },

  /**
   * (SIMULADO) Inicia o pipeline de fechamento mensal.
   * @param competence A competência no formato 'MM/YYYY'.
   * @param companyId O ID da empresa.
   */
  executeMonthlyClosing: async ({ competence, companyId }: { competence: string; companyId: string }) => {
    console.log(`[AI TOOL] SIMULATING executeMonthlyClosing for ${competence}...`);
    // Em um sistema real, isso dispararia uma série de operações no backend:
    // 1. Validar todos os documentos do mês.
    // 2. Rodar o taxEngine.
    // 3. Salvar o resultado na tabela 'monthly_closings'.
    // 4. Gerar os arquivos (SPED, relatórios).
    // Aqui, apenas retornamos uma mensagem de sucesso.
    return JSON.stringify({ 
      status: 'SUCCESS',
      message: `Pipeline de fechamento para a competência ${competence} da empresa ${companyId} foi iniciado com sucesso. O resultado será enviado como notificação.`
    });
  }
};

export type ToolName = keyof typeof tools;

export const aiTools = tools;
