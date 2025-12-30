import { createClient } from '@supabase/supabase-js';
import { Company, FiscalDocument, SystemLog, InvoiceItem, Obligation, ValidationIssue, AILearning, TaxCalculationResult, Notification, MonthlyClosing, ChatMessage, AuditLog, AuthenticatedUser } from '../types';
import { taxEngine } from './taxEngine';
import { analyzeTaxScenario, runBenefitRadarAgent, runOperationalAgent } from './geminiService';
import { validatorService } from './validatorService';
import { aiTools, ToolName } from './aiTools';

// Configuração Real do Supabase (Fornecida pelo usuário)
const supabaseUrl = 'https://glvrujvecxvinpprrlrm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdnJ1anZlY3h2aW5wcHJybHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzQ5MjcsImV4cCI6MjA4MDQ1MDkyN30.QeqOq4zx3v3HWHkReMAASdDaW71WzV25ZRF_fqq5NW0';

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- MOCK STORAGE IMPLEMENTATION (Fallback) ---
const STORAGE_KEYS = {
  COMPANIES: 'contabil_companies',
  DOCUMENTS: 'contabil_documents',
  LOGS: 'contabil_logs',
  OBLIGATIONS: 'contabil_obligations',
  LEARNINGS: 'contabil_learnings',
  NOTIFICATIONS: 'contabil_notifications',
  CLOSINGS: 'contabil_closings',
  AUDIT_LOGS: 'contabil_audit_logs', // NEW
};

const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocal = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- DATA MAPPERS (Snake <-> Camel) ---
// ... (código existente de mappers sem alterações)

// --- SERVICES ---

// NEW: Audit Log Service for SOC2-like compliance
export const auditLogService = {
  async create(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const logs = getLocal<AuditLog>(STORAGE_KEYS.AUDIT_LOGS);
    const newLog = { ...log, id: `audit_${Date.now()}`, timestamp: new Date().toISOString() };
    setLocal(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs]);
    return newLog;
  },
  async list(companyId: string): Promise<AuditLog[]> {
     return getLocal<AuditLog>(STORAGE_KEYS.AUDIT_LOGS).filter(l => 
        l.target_entity === 'companies' || // Global changes
        (l.old_value?.company_id === companyId || l.new_value?.company_id === companyId)
     );
  }
}


export const companyService = {
  async list(): Promise<Company[]> {
    return getLocal<Company>(STORAGE_KEYS.COMPANIES);
  },
  async create(company: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
    const companies = getLocal<Company>(STORAGE_KEYS.COMPANIES);
    const newCompany = { ...company, id: `comp_${Date.now()}`, created_at: new Date().toISOString() };
    setLocal(STORAGE_KEYS.COMPANIES, [...companies, newCompany]);
    return newCompany;
  },
  async update(id: string, updates: Partial<Company>, user: AuthenticatedUser, reason: string): Promise<Company> {
    const companies = getLocal<Company>(STORAGE_KEYS.COMPANIES);
    const oldCompany = companies.find(c => c.id === id);
    if (!oldCompany) throw new Error("Company not found");

    let updatedCompany: Company | undefined;
    const updatedCompanies = companies.map(c => {
      if (c.id === id) {
        updatedCompany = { ...c, ...updates };
        return updatedCompany;
      }
      return c;
    });

    setLocal(STORAGE_KEYS.COMPANIES, updatedCompanies);
    
    // Create Audit Log
    await auditLogService.create({
      user_id: user.id,
      user_name: user.name,
      action: 'UPDATE_COMPANY',
      target_entity: 'companies',
      target_id: id,
      old_value: oldCompany,
      new_value: updatedCompany,
      reason,
    });
    
    return updatedCompany!;
  },
  async delete(id: string): Promise<void> {
    const companies = getLocal<Company>(STORAGE_KEYS.COMPANIES);
    const filtered = companies.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.COMPANIES, filtered);
  }
};
export const obligationService = {
  async list(companyId: string): Promise<Obligation[]> {
    return getLocal<Obligation>(STORAGE_KEYS.OBLIGATIONS).filter(o => o.company_id === companyId);
  },
  async updateStatus(id: string, status: Obligation['status'], issues?: ValidationIssue[]): Promise<Obligation> {
    const obligations = getLocal<Obligation>(STORAGE_KEYS.OBLIGATIONS);
    let updatedObligation: Obligation | undefined;
    const updatedObligations = obligations.map(o => {
      if (o.id === id) {
        updatedObligation = { ...o, status, validation_issues: issues, updated_at: new Date().toISOString() };
        return updatedObligation;
      }
      return o;
    });
    if (!updatedObligation) throw new Error("Obligation not found");
    setLocal(STORAGE_KEYS.OBLIGATIONS, updatedObligations);
    return updatedObligation;
  },
  async upsert(obligation: Omit<Obligation, 'created_at' | 'updated_at'>): Promise<Obligation> {
    const obligations = getLocal<Obligation>(STORAGE_KEYS.OBLIGATIONS);
    const existingIndex = obligations.findIndex(o => o.id === obligation.id);
    if (existingIndex > -1) {
      const updatedObligation = { ...obligations[existingIndex], ...obligation, updated_at: new Date().toISOString() };
      obligations[existingIndex] = updatedObligation;
      setLocal(STORAGE_KEYS.OBLIGATIONS, obligations);
      return updatedObligation;
    } else {
      const newObligation = { ...obligation, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setLocal(STORAGE_KEYS.OBLIGATIONS, [...obligations, newObligation]);
      return newObligation;
    }
  }
};
export const documentService = {
  async create(doc: Omit<FiscalDocument, 'id'>): Promise<FiscalDocument> {
    const documents = getLocal<FiscalDocument>(STORAGE_KEYS.DOCUMENTS);
    const newDoc = { ...doc, id: `doc_${Date.now()}_${Math.random()}` };
    setLocal(STORAGE_KEYS.DOCUMENTS, [...documents, newDoc]);
    return newDoc;
  }
};
export const logService = {
  async create(log: Omit<SystemLog, 'id'>): Promise<SystemLog> {
    const logs = getLocal<SystemLog>(STORAGE_KEYS.LOGS);
    const newLog = { ...log, id: `log_${Date.now()}` };
    setLocal(STORAGE_KEYS.LOGS, [newLog, ...logs.slice(0, 99)]);
    return newLog;
  }
};
export const aiLearningService = {
    async listByCompany(companyId: string): Promise<AILearning[]> {
        return getLocal<AILearning>(STORAGE_KEYS.LEARNINGS).filter(l => l.company_id === companyId);
    },
    async create(learning: Omit<AILearning, 'id' | 'created_at'>, user: AuthenticatedUser, reason: string): Promise<AILearning> {
      const learnings = getLocal<AILearning>(STORAGE_KEYS.LEARNINGS);
      const newLearning = { ...learning, id: `learn_${Date.now()}`, created_at: new Date().toISOString() };
      setLocal(STORAGE_KEYS.LEARNINGS, [newLearning, ...learnings]);

      await auditLogService.create({
          user_id: user.id,
          user_name: user.name,
          action: 'CREATE_AI_LEARNING',
          target_entity: 'ai_learnings',
          target_id: newLearning.id,
          old_value: null,
          new_value: newLearning,
          reason,
      });

      return newLearning;
    }
};
export const notificationService = {
    async markAsRead(id: string): Promise<Notification> {
        const notifications = getLocal<Notification>(STORAGE_KEYS.NOTIFICATIONS);
        let updatedNotification: Notification | undefined;
        const updatedNotifications = notifications.map(n => {
            if (n.id === id) {
                updatedNotification = { ...n, is_read: true };
                return updatedNotification;
            }
            return n;
        });
        if (!updatedNotification) throw new Error("Notification not found");
        setLocal(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
        return updatedNotification;
    }
};
export const closingService = { /* ... */ };


// --- BFF (Backend-for-Frontend) Functions Service ---
export const functions = {
  // ... (código existente de invokeTaxCalculator, invokeGeminiAuditor, etc.)

  /**
   * Invoca o Agente Operacional de Chat, orquestrando o ciclo de Function Calling.
   */
  async invokeChat(message: string, history: ChatMessage[], isDemoMode: boolean, companyId: string): Promise<ChatMessage[]> {
    console.log("BFF: Iniciando ciclo de chat operacional...");
    
    // Fallback para execução local (Modo Demo)
    if (isDemoMode) {
      console.log("BFF Fallback: Rodando agente operacional localmente.");
      // Primeira chamada para a IA para decidir a ação
      const response = await runOperationalAgent(message, history, companyId);
      const toolCalls = response.functionCalls;

      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        const toolName = toolCall.name as ToolName;
        
        // Mensagem de "Pensamento" para a UI
        const thinkingMessage: ChatMessage = {
          role: 'tool',
          text: `Executando ferramenta: ${toolName}`,
          tool_calls: toolCalls,
          timestamp: new Date(),
        };

        console.log(`BFF: IA solicitou a ferramenta '${toolName}' com os argumentos:`, toolCall.args);
        
        let toolResult = "";
        if (aiTools[toolName]) {
          toolResult = await aiTools[toolName](toolCall.args as any);
        } else {
          toolResult = JSON.stringify({ error: `Ferramenta '${toolName}' não encontrada.` });
        }
        
        console.log(`BFF: Resultado da ferramenta:`, toolResult);

        // Mensagem de resultado da ferramenta para a IA
        const toolOutputMessage: ChatMessage = {
          role: 'tool',
          text: `Resultado da ferramenta ${toolName}`,
          tool_outputs: [{
            name: toolName,
            response: { content: toolResult }
          }],
          timestamp: new Date()
        };

        // Segunda chamada para a IA, com o resultado da ferramenta, para obter a resposta final
        const finalResponse = await runOperationalAgent(message, [...history, thinkingMessage, toolOutputMessage], companyId);
        
        const finalMessage: ChatMessage = {
          role: 'model',
          text: finalResponse.text || "Não foi possível processar a resposta.",
          timestamp: new Date()
        };
        
        return [thinkingMessage, toolOutputMessage, finalMessage];
      } else {
        // A IA respondeu diretamente sem usar ferramentas
        return [{
          role: 'model',
          text: response.text || "Não consegui entender sua solicitação.",
          timestamp: new Date()
        }];
      }
    }

    // Lógica de produção (chamada à Edge Function)
    try {
      console.log("BFF: Invocando Edge Function 'gemini-operational-agent'...");
      const { data, error } = await supabase.functions.invoke('gemini-operational-agent', { 
        body: { message, history, companyId } 
      });
      if (error) throw error;
      // A Edge Function deve retornar o mesmo array de mensagens que o fallback local.
      return data.messages;
    } catch (e) {
      console.error("BFF Error: Falha ao invocar 'gemini-operational-agent'.", e);
      throw new Error("Erro de comunicação com o backend da IA.");
    }
  },

  // ... (outras funções do BFF existentes)
   async invokeTaxCalculator(payload: any, isDemoMode: boolean) {
    if (isDemoMode) {
      return taxEngine.calculate(payload.financialData, payload.documents, payload.company);
    }
    // ...
  },
  async invokeGeminiAuditor(result: TaxCalculationResult, isDemoMode: boolean, company: Company) {
     const learnings = isDemoMode 
      ? getLocal<AILearning>(STORAGE_KEYS.LEARNINGS).filter(l => l.company_id === company.id)
      : await aiLearningService.listByCompany(company.id);

     if (isDemoMode) {
      return analyzeTaxScenario(result, learnings);
    }
    // ...
  },
  async invokeBenefitRadar(payload: any, isDemoMode: boolean) {
    if (isDemoMode) {
      return runBenefitRadarAgent(payload);
    }
    // ...
  },
  async invokeSpedValidator(documents: FiscalDocument[], isDemoMode: boolean): Promise<ValidationIssue[]> {
    console.log("Simulando chamada de backend para validação SPED...");
    await new Promise(res => setTimeout(res, 1200));
    return validatorService.validateSped(documents);
  },
  async invokeDocumentTransmitter(obligation: Obligation, isDemoMode: boolean): Promise<{ success: boolean; protocol: string }> {
    console.log(`Simulando transmissão para a SEFAZ da obrigação: ${obligation.name}`);
    await new Promise(res => setTimeout(res, 2500));
    return {
      success: true,
      protocol: `2024${Date.now()}`
    };
  }
};
