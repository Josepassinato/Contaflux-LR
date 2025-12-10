export interface FinancialData {
  grossRevenue: number;
  operatingExpenses: number;
  additions: number;
  exclusions: number;
  priorLosses: number; // Prejuízo Fiscal acumulado
}

export interface RegimeComparison {
  presumido: {
    totalTax: number;
    pis: number;
    cofins: number;
    irpj: number;
    csll: number;
    effectiveRate: number;
  };
  real: {
    totalTax: number;
    effectiveRate: number;
  };
  bestRegime: 'Lucro Real' | 'Lucro Presumido';
  savings: number;
}

export interface TaxCalculationResult {
  realProfit: number;
  irpj: number;
  irpjAdicional: number; // New
  csll: number;
  pis: number;
  pisDebits: number;   // New
  pisCredits: number;  // New
  cofins: number;
  cofinsDebits: number;// New
  cofinsCredits: number;// New
  totalTax: number;
  effectiveRate: number;
  analysis: string;
  basis: number; // Lucro Real Ajustado
  offset: number; // Compensação Prejuízo
  comparison?: RegimeComparison; // New: Planejamento Tributário
}

export enum CalculationStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface TaxProfile {
  isMonofasico?: boolean;
  icmsStRegime?: 'substituto' | 'substituido';
  industryType?: 'comercio' | 'industria' | 'servicos_gerais' | 'servicos_hospitalares';
}


// Database Entities (Supabase Mapped)
export interface Company {
  id: string;
  created_at?: string;
  name: string;
  cnpj: string;
  regime: 'Lucro Real' | 'Lucro Presumido';
  status: 'active' | 'pending' | 'warning';
  user_id?: string; // For RLS (Row Level Security)
  cnae_principal?: string;
  tax_profile?: TaxProfile;
}

export interface InvoiceItem {
  id?: string;
  document_id?: string;
  name: string;
  ncm: string;
  cfop: string;
  cst: string; // ICMS CST
  cstPis?: string;
  cstCofins?: string;
  amount: number; // Valor do Produto
  vICMS: number;
  pICMS?: number;
  vPIS: number;
  pPIS?: number;
  vCOFINS: number;
  pCOFINS?: number;
  vIPI: number;
  pIPI?: number;
}

export interface FiscalDocument {
  id: string;
  created_at?: string;
  company_id: string; // Changed from companyId to match DB column
  xml_content?: string; // Raw XML
  access_key?: string; // Changed from accessKey
  issuer_cnpj?: string; // Changed from issuerCNPJ
  issuer_name?: string; // Changed from issuerName
  name: string;
  type: 'NFe' | 'NFCe' | 'CTe' | 'PDF';
  operation_type: 'entry' | 'exit'; // Changed from operationType
  date: string;
  status: 'processing' | 'classified' | 'error';
  confidence: number;
  amount: number; 
  items: InvoiceItem[];
  // Campos totalizadores
  total_icms: number; // Snake case for DB
  total_pis: number;
  total_cofins: number;
  total_ipi: number;
}

export type ObligationStatus = 'pending' | 'generated' | 'validated' | 'transmitted' | 'error';

export interface Obligation {
  id: string;
  created_at?: string;
  updated_at?: string;
  company_id: string;
  name: string;
  deadline: string;
  status: ObligationStatus; 
  competence: string;
  validation_issues?: ValidationIssue[]; 
}

export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning'; // error bloqueia download, warning avisa
  message: string;
  details?: string; // Ex: Chave da nota ou nome do item
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface SystemLog {
  id: string;
  company_id: string;
  action: string; 
  details: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// SPED Helper Interfaces
export interface SpedParticipant {
  code: string;
  name: string;
  cnpj: string;
  type: 'PJ' | 'PF';
}

export interface SpedProduct {
  code: string;
  name: string;
  unit: string;
  ncm: string;
}

// RADAR DE BENEFÍCIOS
export interface InvestmentSuggestion {
  id: string;
  category: 'innovation' | 'training' | 'marketing' | 'sustainability' | 'software';
  title: string;
  description: string;
  suggestedAmount: number;
  estimatedTaxSaving: number;
  legalBasis: string;
  impact: 'high' | 'medium' | 'low';
}

// BFF Props
export interface TaxCalculatorProps {
    companyDocuments: FiscalDocument[];
    onCalculateLog: (msg: string) => void;
    company: Company;
    isDemoMode: boolean;
}

export interface AIAssistantProps {
    company: Company;
    isDemoMode: boolean;
}

export interface AILearning {
  id: string;
  created_at?: string;
  company_id: string;
  learning_type: 'cst_correction' | 'cfop_correction' | 'expense_classification';
  context: Record<string, any>; // e.g., { itemName: 'CONSULTORIA XPTO' }
  corrected_value: Record<string, any>; // e.g., { cstPis: '50', cfop: '1933' }
  justification: string;
}

export interface DocumentsProps {
  companyId: string;
  documents: FiscalDocument[];
  onUploadSuccess: () => void;
  onAddLearning: (learning: Omit<AILearning, 'id' | 'created_at'>) => void;
}
