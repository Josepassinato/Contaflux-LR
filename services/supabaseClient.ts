import { createClient } from '@supabase/supabase-js';
import { Company, FiscalDocument, SystemLog, InvoiceItem, Obligation, ValidationIssue, AILearning, TaxCalculationResult } from '../types';
import { taxEngine } from './taxEngine';
import { analyzeTaxScenario, runBenefitRadarAgent, chatWithLegalExpert } from './geminiService';
import { validatorService } from './validatorService';

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
};

const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocal = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- DATA MAPPERS (Snake <-> Camel) ---
export const mapItemFromDB = (item: any): InvoiceItem => ({
    id: item.id, document_id: item.document_id, name: item.name, ncm: item.ncm, cfop: item.cfop, cst: item.cst,
    cstPis: item.cst_pis || '', cstCofins: item.cst_cofins || '', 
    amount: Number(item.amount || 0), vICMS: Number(item.v_icms || 0), pICMS: Number(item.p_icms || 0),
    vPIS: Number(item.v_pis || 0), pPIS: Number(item.p_pis || 0), vCOFINS: Number(item.v_cofins || 0),
    pCOFINS: Number(item.p_cofins || 0), vIPI: Number(item.v_ipi || 0), pIPI: Number(item.p_ipi || 0)
});
export const mapDocumentFromDB = (doc: any): FiscalDocument => ({
    ...doc, items: doc.items ? doc.items.map(mapItemFromDB) : [], amount: Number(doc.amount || 0),
    total_icms: Number(doc.total_icms || 0), total_pis: Number(doc.total_pis || 0),
    total_cofins: Number(doc.total_cofins || 0), total_ipi: Number(doc.total_ipi || 0)
});
export const mapItemToDB = (item: InvoiceItem, documentId: string) => ({
    document_id: documentId, name: item.name, ncm: item.ncm, cfop: item.cfop, cst: item.cst,
    cst_pis: item.cstPis, cst_cofins: item.cstCofins, amount: item.amount, v_icms: item.vICMS,
    p_icms: item.pICMS, v_pis: item.vPIS, p_pis: item.pPIS, v_cofins: item.vCOFINS,
    p_cofins: item.pCOFINS, v_ipi: item.vIPI, p_ipi: item.pIPI
});
export const mapDocumentToDB = (doc: FiscalDocument) => ({
    company_id: doc.company_id, name: doc.name, xml_content: doc.xml_content, access_key: doc.access_key,
    issuer_cnpj: doc.issuer_cnpj, issuer_name: doc.issuer_name, type: doc.type, operation_type: doc.operation_type,
    date: doc.date, status: doc.status, confidence: doc.confidence, amount: doc.amount,
    total_icms: doc.total_icms, total_pis: doc.total_pis, total_cofins: doc.total_cofins, total_ipi: doc.total_ipi
});

// --- SERVICES ---

export const companyService = {
  async list() {
    try {
      const { data, error } = await supabase.from('companies').select('*').order('name');
      if (error) throw error;
      return data as Company[];
    } catch (e) {
      console.warn("Supabase indisponível/Tabelas não criadas. Usando Mock Local para Empresas.");
      return getLocal<Company>(STORAGE_KEYS.COMPANIES);
    }
  },
  async create(company: Omit<Company, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase.from('companies').insert(company).select().single();
      if (error) throw error;
      return data as Company;
    } catch (e) {
      const localData = getLocal<Company>(STORAGE_KEYS.COMPANIES);
      const newCompany = { ...company, id: Date.now().toString(), created_at: new Date().toISOString() };
      setLocal(STORAGE_KEYS.COMPANIES, [...localData, newCompany]);
      return newCompany;
    }
  },
  async update(id: string, updates: Partial<Company>) {
    try {
        const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as Company;
    } catch (e) {
        const localData = getLocal<Company>(STORAGE_KEYS.COMPANIES);
        const index = localData.findIndex(c => c.id === id);
        if (index !== -1) {
            localData[index] = { ...localData[index], ...updates };
            setLocal(STORAGE_KEYS.COMPANIES, localData);
            return localData[index];
        }
        throw new Error("Company not found in local storage");
    }
  },
  async delete(id: string) {
      try {
          const { error } = await supabase.from('companies').delete().eq('id', id);
          if (error) throw error;
      } catch (e) {
          const localData = getLocal<Company>(STORAGE_KEYS.COMPANIES);
          const filtered = localData.filter(c => c.id !== id);
          setLocal(STORAGE_KEYS.COMPANIES, filtered);
      }
  }
};

export const obligationService = {
    async list(companyId: string) {
        try {
            const { data, error } = await supabase.from('obligations').select('*').eq('company_id', companyId).order('deadline', { ascending: false });
            if (error) throw error;
            return data as Obligation[];
        } catch (e) {
            const data = getLocal<Obligation>(STORAGE_KEYS.OBLIGATIONS);
            return data.filter(o => o.company_id === companyId);
        }
    },
    async upsert(obligation: Obligation) {
        try {
            const { data, error } = await supabase.from('obligations').upsert(obligation, { onConflict: 'id' }).select().single();
            if (error) throw error;
            return data as Obligation;
        } catch (e) {
            const localData = getLocal<Obligation>(STORAGE_KEYS.OBLIGATIONS);
            const index = localData.findIndex(o => o.id === obligation.id);
            if (index !== -1) {
                localData[index] = { ...localData[index], ...obligation };
            } else {
                localData.push(obligation);
            }
            setLocal(STORAGE_KEYS.OBLIGATIONS, localData);
            return obligation;
        }
    },
    async updateStatus(id: string, status: Obligation['status'], issues?: any[]) {
        try {
            await supabase.from('obligations').update({ status, validation_issues: issues }).eq('id', id);
        } catch (e) {
            const localData = getLocal<Obligation>(STORAGE_KEYS.OBLIGATIONS);
            const index = localData.findIndex(o => o.id === id);
            if (index !== -1) {
                localData[index].status = status;
                if(issues) localData[index].validation_issues = issues;
                setLocal(STORAGE_KEYS.OBLIGATIONS, localData);
            }
        }
    }
};

export const documentService = {
  async listByCompany(companyId: string) {
    try {
      const { data, error } = await supabase.from('documents').select(`*, items:invoice_items(*)`).eq('company_id', companyId).order('date', { ascending: false });
      if (error) throw error;
      return data.map(mapDocumentFromDB);
    } catch (e) {
      console.warn("Usando Mock Local para Documentos.");
      const docs = getLocal<FiscalDocument>(STORAGE_KEYS.DOCUMENTS);
      return docs.filter(d => d.company_id === companyId);
    }
  },
  async create(doc: FiscalDocument) {
    try {
      const docData = mapDocumentToDB(doc);
      const { data: savedDoc, error: docError } = await supabase.from('documents').insert(docData).select().single();
      if (docError) throw docError;
      if (doc.items && doc.items.length > 0) {
        const itemsData = doc.items.map(item => mapItemToDB(item, savedDoc.id));
        const { error: itemsError } = await supabase.from('invoice_items').insert(itemsData);
        if (itemsError) console.error("Error saving items to Supabase", itemsError);
      }
      return savedDoc;
    } catch (e) {
      const localData = getLocal<FiscalDocument>(STORAGE_KEYS.DOCUMENTS);
      const newDoc = { ...doc, id: Date.now().toString() };
      setLocal(STORAGE_KEYS.DOCUMENTS, [...localData, newDoc]);
      return newDoc;
    }
  },
  async deleteAllFromCompany(companyId: string) {
    try {
      await supabase.from('documents').delete().eq('company_id', companyId);
      await supabase.from('obligations').delete().eq('company_id', companyId);
    } catch (e) {
      const docs = getLocal<FiscalDocument>(STORAGE_KEYS.DOCUMENTS);
      const filteredDocs = docs.filter(d => d.company_id !== companyId);
      setLocal(STORAGE_KEYS.DOCUMENTS, filteredDocs);
      const obs = getLocal<Obligation>(STORAGE_KEYS.OBLIGATIONS);
      const filteredObs = obs.filter(o => o.company_id !== companyId);
      setLocal(STORAGE_KEYS.OBLIGATIONS, filteredObs);
    }
  }
};

export const logService = {
  async list(companyId: string) {
    try {
      const { data, error } = await supabase.from('logs').select('*').eq('company_id', companyId).order('timestamp', { ascending: false }).limit(50);
      if (error) throw error;
      return data as SystemLog[];
    } catch (e) {
      const logs = getLocal<SystemLog>(STORAGE_KEYS.LOGS);
      return logs.filter(l => l.company_id === companyId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
    }
  },
  async create(log: Omit<SystemLog, 'id'>) {
    try {
      await supabase.from('logs').insert(log);
    } catch (e) {
      const localData = getLocal<SystemLog>(STORAGE_KEYS.LOGS);
      const newLog = { ...log, id: Date.now().toString() };
      setLocal(STORAGE_KEYS.LOGS, [...localData, newLog]);
    }
  }
};

export const aiLearningService = {
  async listByCompany(companyId: string): Promise<AILearning[]> {
    try {
      const { data, error } = await supabase.from('ai_learnings').select('*').eq('company_id', companyId);
      if (error) throw error;
      return data as AILearning[];
    } catch (e) {
      const learnings = getLocal<AILearning>(STORAGE_KEYS.LEARNINGS);
      return learnings.filter(l => l.company_id === companyId);
    }
  },
  async create(learning: Omit<AILearning, 'id' | 'created_at'>): Promise<AILearning> {
    try {
      const { data, error } = await supabase.from('ai_learnings').insert(learning).select().single();
      if (error) throw error;
      return data as AILearning;
    } catch (e) {
      const localData = getLocal<AILearning>(STORAGE_KEYS.LEARNINGS);
      const newLearning = { ...learning, id: Date.now().toString(), created_at: new Date().toISOString() };
      setLocal(STORAGE_KEYS.LEARNINGS, [...localData, newLearning]);
      return newLearning;
    }
  }
};

// --- BFF (Backend-for-Frontend) Functions Service ---
export const functions = {
  /**
   * Invoca a Edge Function de cálculo (ou o motor local como fallback).
   */
  async invokeTaxCalculator(payload: any, isDemoMode: boolean) {
    if (isDemoMode) {
      console.log("BFF Fallback: Running tax engine locally.");
      // FIX: The `taxEngine.calculate` function expects 2 arguments, but 3 were provided.
      return taxEngine.calculate(payload.financialData, payload.documents);
    }
    try {
      const { data, error } = await supabase.functions.invoke('tax-engine-calculator', { body: payload });
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("BFF Error: Falha ao invocar 'tax-engine-calculator'. Executando fallback local.", e);
      // FIX: The `taxEngine.calculate` function expects 2 arguments, but 3 were provided.
      return taxEngine.calculate(payload.financialData, payload.documents);
    }
  },

  /**
   * Invoca a Edge Function de auditoria da IA (ou o serviço local como fallback).
   */
  async invokeGeminiAuditor(result: TaxCalculationResult, isDemoMode: boolean, company: Company) {
     // BFF Orchestration: Fetch learnings before calling the agent
    const learnings = isDemoMode 
      ? getLocal<AILearning>(STORAGE_KEYS.LEARNINGS).filter(l => l.company_id === company.id)
      : await aiLearningService.listByCompany(company.id);

     if (isDemoMode) {
      console.log("BFF Fallback: Running Gemini auditor locally with enriched context.");
      return analyzeTaxScenario(result, learnings);
    }
    try {
      const { data, error } = await supabase.functions.invoke('gemini-auditor', { body: { result, learnings } });
      if (error) throw error;
      return data.analysis;
    } catch (e) {
      console.warn("BFF Error: Falha ao invocar 'gemini-auditor'. Executando fallback local.", e);
      return analyzeTaxScenario(result, learnings);
    }
  },

  /**
   * Invoca a Edge Function do Radar de Benefícios (ou o serviço local como fallback).
   */
  async invokeBenefitRadar(payload: any, isDemoMode: boolean) {
    if (isDemoMode) {
      console.log("BFF Fallback: Running Benefit Radar locally.");
      return runBenefitRadarAgent(payload);
    }
    try {
      const { data, error } = await supabase.functions.invoke('benefit-radar', { body: payload });
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("BFF Error: Falha ao invocar 'benefit-radar'. Executando fallback local.", e);
      return runBenefitRadarAgent(payload);
    }
  },

   /**
   * Invoca a Edge Function de Chat (ou a função local como fallback).
   */
  async invokeChat(message: string, history: any[], isDemoMode: boolean) {
    if (isDemoMode) {
      console.log("BFF Fallback: Running Chat locally.");
      // FIX: The `chatWithLegalExpert` function expects 2 arguments, but 3 were provided.
      return chatWithLegalExpert(message, history);
    }
    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', { body: { message, history } });
      if (error) throw error;
      return data.reply;
    } catch (e) {
      console.warn("BFF Error: Falha ao invocar 'gemini-chat'. Executando fallback local.", e);
      return chatWithLegalExpert(message, history);
    }
  },

  /**
   * SIMULAÇÃO: Invoca a Edge Function de validação SPED (ou o validador local).
   */
  async invokeSpedValidator(documents: FiscalDocument[], isDemoMode: boolean): Promise<ValidationIssue[]> {
    console.log("Simulando chamada de backend para validação SPED...");
    await new Promise(res => setTimeout(res, 1200)); // Simula latência de rede
    
    // Em uma implementação real, o 'documents' seria o conteúdo do arquivo .txt
    // e o backend chamaria uma API externa (Tecnospeed, etc.)
    // Aqui, usamos o validador local para simular a resposta do backend.
    return validatorService.validateSped(documents);
  },

  /**
   * SIMULAÇÃO: Invoca a Edge Function de transmissão de documento.
   */
  async invokeDocumentTransmitter(obligation: Obligation, isDemoMode: boolean): Promise<{ success: boolean; protocol: string }> {
    console.log(`Simulando transmissão para a SEFAZ da obrigação: ${obligation.name}`);
    await new Promise(res => setTimeout(res, 2500)); // Simula latência de rede

    // Em um cenário real, o backend usaria o Certificado A1 para assinar e transmitir.
    return {
      success: true,
      protocol: `2024${Date.now()}`
    };
  }
};
