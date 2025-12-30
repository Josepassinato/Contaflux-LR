import { Company, FiscalDocument, Obligation, SystemLog, InvoiceItem, AuthenticatedUser, AuditEntry, Notification, AuditLog } from '../types';

const MOCK_COMPANY_ID = 'demo-company-123';
const MOCK_USER_ID = 'user-demo-accountant-987';

export const mockUser: AuthenticatedUser = {
  id: MOCK_USER_ID,
  email: 'contador.demo@contaflux.com',
  name: 'Contador de Demonstração',
  role: 'accountant', // Change to 'employee' or 'admin' to test RBAC
};

export const mockCompany: Company = {
  id: MOCK_COMPANY_ID,
  name: 'ContaFlux Demo S.A.',
  cnpj: '00.111.222/0001-33',
  regime: 'Lucro Real',
  status: 'active',
  created_at: new Date().toISOString(),
  cnae_principal: '6201501', // Desenvolvimento de programas de computador
  tax_profile: {
    isMonofasico: false,
    industryType: 'servicos_gerais'
  },
  erp_integration: {
      type: 'ContaAzul',
      status: 'disconnected'
  }
};

const mockAuditHistory: AuditEntry[] = [
    {
        id: 'audit-1',
        timestamp: '2024-05-20T10:00:00Z',
        user_name: 'Sistema IA',
        action: 'CLASSIFICAÇÃO AUTOMÁTICA',
        details: 'Documento processado via XML. Operação de entrada classificada com base no CFOP 1933.',
    },
    {
        id: 'audit-2',
        timestamp: '2024-05-21T14:35:10Z',
        user_name: 'João da Silva (Contador)',
        action: 'CORREÇÃO MANUAL DE CST',
        details: 'CST de PIS/COFINS do item "LICENÇA DE SOFTWARE" alterado de 70 para 50.',
        reason: 'Aquisição de software utilizado diretamente na prestação de serviço (insumo), conforme Lei 10.833/03 e solução de consulta COSIT nº 191/2017.',
    }
]


export const mockDocuments: FiscalDocument[] = [
  // Mês Março/2024
  {
    id: 'doc-1', company_id: MOCK_COMPANY_ID, name: 'NFe-Saida-Mar24.xml', type: 'NFe', operation_type: 'exit',
    date: '2024-03-15', status: 'classified', confidence: 1.0, amount: 150000,
    access_key: '35240300111222000133550010001234561000000018',
    issuer_name: 'ContaFlux Demo S.A.', issuer_cnpj: '00.111.222/0001-33',
    total_icms: 18000, total_pis: 2475, total_cofins: 11400, total_ipi: 0,
    items: [
      { name: 'SERVIÇO DE CONSULTORIA TRIBUTÁRIA', ncm: '69101000', cfop: '5933', cst: '01', cstPis: '01', cstCofins: '01', amount: 150000, vICMS: 18000, pICMS: 12, vPIS: 2475, pPIS: 1.65, vCOFINS: 11400, pCOFINS: 7.6, vIPI: 0, pIPI: 0 },
    ]
  },
  {
    id: 'doc-2', company_id: MOCK_COMPANY_ID, name: 'NFe-Entrada-Mar24.xml', type: 'NFe', operation_type: 'entry',
    date: '2024-03-10', status: 'classified', confidence: 1.0, amount: 80000,
    access_key: '41240399888777000155550010009876541000000023',
    issuer_name: 'FORNECEDOR DE SOFTWARE LTDA', issuer_cnpj: '99.888.777/0001-55',
    total_icms: 9600, total_pis: 1320, total_cofins: 6080, total_ipi: 0,
    history: mockAuditHistory, // ADDING AUDIT HISTORY
    items: [
      { name: 'LICENÇA DE SOFTWARE ERP ANUAL', ncm: '85234990', cfop: '1933', cst: '51', cstPis: '50', cstCofins: '50', amount: 80000, vICMS: 9600, pICMS: 12, vPIS: 1320, pPIS: 1.65, vCOFINS: 6080, pCOFINS: 7.6, vIPI: 0, pIPI: 0 },
    ]
  },
  // Mês Abril/2024
  {
    id: 'doc-3', company_id: MOCK_COMPANY_ID, name: 'NFe-Saida-Abr24.xml', type: 'NFe', operation_type: 'exit',
    date: '2024-04-20', status: 'classified', confidence: 1.0, amount: 250000,
    access_key: '35240400111222000133550010001234571000000031',
    issuer_name: 'ContaFlux Demo S.A.', issuer_cnpj: '00.111.222/0001-33',
    total_icms: 30000, total_pis: 4125, total_cofins: 19000, total_ipi: 0,
    items: [
      { name: 'DESENVOLVIMENTO DE PROJETO IA', ncm: '69101000', cfop: '5933', cst: '01', cstPis: '01', cstCofins: '01', amount: 250000, vICMS: 30000, pICMS: 12, vPIS: 4125, pPIS: 1.65, vCOFINS: 19000, pCOFINS: 7.6, vIPI: 0, pIPI: 0 },
    ]
  },
  {
    id: 'doc-4', company_id: MOCK_COMPANY_ID, name: 'NFe-Entrada-Mat-Escritorio.xml', type: 'NFe', operation_type: 'entry',
    date: '2024-04-05', status: 'classified', confidence: 1.0, amount: 5000,
    access_key: '41240499888777000155550010009876551000000045',
    issuer_name: 'PAPELARIA CENTRAL', issuer_cnpj: '99.888.777/0001-55',
    total_icms: 0, total_pis: 0, total_cofins: 0, total_ipi: 0,
    items: [
      // Item sem direito a crédito
      { name: 'MATERIAL DE ESCRITÓRIO', ncm: '39261000', cfop: '1949', cst: '90', cstPis: '70', cstCofins: '70', amount: 5000, vICMS: 0, pICMS: 0, vPIS: 0, pPIS: 0, vCOFINS: 0, pCOFINS: 0, vIPI: 0, pIPI: 0 },
    ]
  },
  {
    id: 'doc-5', company_id: MOCK_COMPANY_ID, name: 'NFe-NCM-Invalido.xml', type: 'NFe', operation_type: 'entry',
    date: '2024-04-12', status: 'classified', confidence: 1.0, amount: 12000,
    access_key: '41240499888777000155550010009876561000000057',
    issuer_name: 'FORNECEDOR DIVERSO', issuer_cnpj: '11.222.333/0001-88',
    total_icms: 1440, total_pis: 198, total_cofins: 912, total_ipi: 0,
    items: [
      // Item com NCM inválido para testar o validador
      { name: 'PRODUTO GENÉRICO', ncm: '00000000', cfop: '1102', cst: '00', cstPis: '53', cstCofins: '53', amount: 12000, vICMS: 1440, pICMS: 12, vPIS: 198, pPIS: 1.65, vCOFINS: 912, pCOFINS: 7.6, vIPI: 0, pIPI: 0 },
    ]
  },
];

export const mockObligations: Obligation[] = [
  { id: 'sped-03/2024-demo', company_id: MOCK_COMPANY_ID, name: 'SPED Fiscal (ICMS/IPI)', deadline: '2024-04-20', status: 'pending', competence: '03/2024' },
  { id: 'efd-03/2024-demo', company_id: MOCK_COMPANY_ID, name: 'EFD Contribuições', deadline: '2024-05-15', status: 'pending', competence: '03/2024' },
];

export const mockLogs: SystemLog[] = [
  { id: 'log-1', company_id: MOCK_COMPANY_ID, action: 'Login', details: 'Acesso via Modo Demonstração', timestamp: new Date().toISOString(), type: 'info' },
  { id: 'log-2', company_id: MOCK_COMPANY_ID, action: 'Cadastro', details: 'Empresa de demonstração carregada.', timestamp: new Date().toISOString(), type: 'success' },
];

export const mockAuditLogs: AuditLog[] = [
    {
        id: 'audit-log-1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        user_id: MOCK_USER_ID,
        user_name: 'Contador de Demonstração',
        action: 'UPDATE_COMPANY',
        target_entity: 'companies',
        target_id: MOCK_COMPANY_ID,
        old_value: { name: 'ContaFlux Demo Ltda', cnae_principal: '6201500' },
        new_value: { name: 'ContaFlux Demo S.A.', cnae_principal: '6201501' },
        reason: 'Correção da Razão Social e atualização do CNAE conforme cartão CNPJ.'
    },
    {
        id: 'audit-log-2',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        user_id: MOCK_USER_ID,
        user_name: 'Contador de Demonstração',
        action: 'CREATE_AI_LEARNING',
        target_entity: 'ai_learnings',
        target_id: 'learn_12345',
        old_value: null,
        new_value: { context: { itemName: 'LICENÇA DE SOFTWARE' }, corrected_value: { cstPis: '50' } },
        reason: 'Software é insumo essencial para a atividade fim da empresa.'
    }
];


export const mockNotifications: Notification[] = [
    {
        id: 'notif-1',
        company_id: MOCK_COMPANY_ID,
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        type: 'recommendation',
        title: 'Oportunidade de Crédito (PIS/COFINS)',
        description: 'Nosso pipeline detectou despesas com software que podem ser elegíveis para crédito. Revise a classificação do CST.',
        is_read: false,
        link_to: 'documents'
    },
    {
        id: 'notif-2',
        company_id: MOCK_COMPANY_ID,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        type: 'error',
        title: 'XML Duplicado Ignorado',
        description: 'O arquivo "NFe-Saida-Mar24.xml" foi importado novamente e ignorado para evitar duplicidade na apuração.',
        is_read: false,
        link_to: 'documents'
    },
    {
        id: 'notif-3',
        company_id: MOCK_COMPANY_ID,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        type: 'success',
        title: 'Fechamento de Março/2024 Concluído',
        description: 'O fechamento automático do mês 03/2024 foi concluído com sucesso. O relatório já está disponível.',
        is_read: true,
        link_to: 'closings'
    }
];