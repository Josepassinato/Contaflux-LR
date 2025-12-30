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
  icmsDebits: number; // New ICMS Fields
  icmsCredits: number; // New ICMS Fields
  icmsBalance: number; // New ICMS Fields
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


// --- ENTERPRISE ARCHITECTURE TYPES ---

export type UserRole = 'admin' | 'accountant' | 'employee' | 'client_viewer';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Simple history entry for a specific document
export interface AuditEntry {
  id: string;
  timestamp: string;
  user_name: string;
  action: string; 
  details: string; 
  reason?: string; 
}

// System-wide, immutable audit log for SOC2-like compliance
export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: string; // Ex: 'UPDATE_COMPANY', 'CREATE_LEARNING'
  target_entity: string; // Ex: 'companies', 'documents'
  target_id: string;
  old_value: any; // JSONB
  new_value: any; // JSONB
  reason: string; // Justificativa obrigatória
}


// --- DATABASE ENTITIES (SUPABASE MAPPED) ---

export type ERPType = 'ContaAzul' | 'Bling' | 'Omie' | 'Tiny';

export interface ERPIntegration {
  type: ERPType;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  last_sync?: string;
  auth_data?: any; // To store tokens securely
}

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
  erp_integration?: ERPIntegration;
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
  company_id: string; 
  xml_content?: string; 
  access_key?: string; 
  issuer_cnpj?: string; 
  issuer_name?: string; 
  name: string;
  type: 'NFe' | 'NFCe' | 'CTe' | 'PDF';
  operation_type: 'entry' | 'exit'; 
  date: string;
  status: 'processing' | 'classified' | 'error';
  confidence: number;
  amount: number; 
  items: InvoiceItem[];
  history?: AuditEntry[]; // NEW: For simple audit trail
  // Campos totalizadores
  total_icms: number; 
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
  severity: 'error' | 'warning'; 
  message: string;
  details?: string; 
}

export interface ChatMessage {
  role: 'user' | 'model' | 'tool';
  text: string;
  tool_calls?: any[];
  tool_outputs?: any[];
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

// --- PIPELINES / AUTOMATION ---
export interface Notification {
  id: string;
  company_id: string;
  timestamp: string;
  type: 'recommendation' | 'error' | 'success' | 'info';
  title: string;
  description: string;
  is_read: boolean;
  link_to?: string; // Path to navigate on click
}

export interface MonthlyClosing {
  id: string;
  company_id: string;
  competence: string; // "YYYY-MM"
  status: 'completed' | 'with_errors';
  closed_at: string;
  closed_by: string;
  total_revenue: number;
  total_tax: number;
  report_url?: string;
  calculation_result: TaxCalculationResult;
}

// --- BFF Props ---
export interface TaxCalculatorProps {
    companyDocuments: FiscalDocument[];
    onCalculateLog: (msg: string) => void;
    company: Company;
    isDemoMode: boolean;
    user: AuthenticatedUser;
}

export interface AIAssistantProps {
    company: Company;
    isDemoMode: boolean;
    user: AuthenticatedUser;
}

export interface AILearning {
  id: string;
  created_at?: string;
  company_id: string;
  user_id: string; 
  learning_type: 'cst_correction' | 'cfop_correction' | 'expense_classification';
  context: Record<string, any>; 
  corrected_value: Record<string, any>; 
  justification: string;
}

export interface DocumentsProps {
  companyId: string;
  documents: FiscalDocument[];
  onUploadSuccess: () => void;
  onAddLearning: (learning: Omit<AILearning, 'id' | 'created_at'>, reason: string) => void;
  user: AuthenticatedUser;
}

export interface CompaniesProps {
    companies: Company[];
    onRefresh: () => void;
    onSelectCompany: (id: string) => void;
    selectedCompanyId: string;
    user: AuthenticatedUser;
}


// --- ERP NORMALIZATION LAYER ---

// Raw data structures as they might come from an ERP API
export interface RawInvoice {
  id: string; // ERP's internal ID
  numero: string;
  data_emissao: string; // "2024-05-10"
  valor_total: number;
  tipo: 'ENTRADA' | 'SAIDA';
  cliente_fornecedor: { nome: string; cnpj_cpf: string; };
  itens: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
  }>;
}

export interface RawXML {
  id: string; // ERP's internal ID
  chave_acesso: string;
  conteudo_xml: string; // Base64 or plain text XML
}

export interface RawServiceInvoice {
    id: string; // ERP's internal ID
    numero: string;
    data_competencia: string;
    valor: number;
    descricao_servico: string;
    tomador: { razao_social: string; cnpj: string; };
    prestador: { razao_social: string; cnpj: string; };
}

export interface CompanyMetadata {
    nome_empresarial: string;
    cnpj: string;
}

// Common types for the provider interface
export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number; // seconds
}

export interface FetchParams {
    startDate: string; // "YYYY-MM-DD"
    endDate: string; // "YYYY-MM-DD"
    page?: number;
}