import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Tool, Part } from "@google/genai";
import { TaxCalculationResult, InvestmentSuggestion, AILearning, ChatMessage } from "../types";
import { searchLegalContext } from "./knowledgeBase";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- AGENTES ANALÍTICOS (Ainda úteis para tarefas específicas) ---

// FIX: Added placeholder implementation to satisfy return type
const runStrategistAgent = async (result: TaxCalculationResult): Promise<string> => Promise.resolve("Strategist agent analysis placeholder.");
// FIX: Added placeholder implementation to satisfy return type
const runAuditorAgent = async (result: TaxCalculationResult, learnings: AILearning[] = []): Promise<string> => Promise.resolve("Auditor agent analysis placeholder.");
// FIX: Added placeholder implementation to satisfy return type
const runComplianceAgent = async (result: TaxCalculationResult): Promise<string> => Promise.resolve("Compliance agent analysis placeholder.");
// FIX: Added placeholder implementation to satisfy return type
export const runBenefitRadarAgent = async (result: TaxCalculationResult): Promise<InvestmentSuggestion[]> => Promise.resolve([]);
// FIX: Added placeholder implementation to satisfy return type
export const analyzeTaxScenario = async (result: TaxCalculationResult, learnings: AILearning[] = []): Promise<string> => Promise.resolve("Tax scenario analysis placeholder.");


// --- NOVO AGENTE PARA O EDITOR DE MAPEAMENTO ---
export const runMappingSuggestionAgent = async (naturalLanguageRule: string): Promise<string> => {
  if (!apiKey) {
    return JSON.stringify({ error: "API Key not configured" });
  }

  const systemInstruction = `
    Você é um tradutor especialista de regras de negócio contábeis para JSON.
    Sua tarefa é converter uma solicitação em linguagem natural de um contador em uma regra estruturada.
    O JSON de saída deve conter 'type', 'conditions' e 'actions'.
    Tipos válidos: 'classification', 'credit_rule'.
    Condições devem usar operadores como 'contains', 'equals', 'startsWith'.
    Ações devem definir o resultado, como 'set_cfop' ou 'allow_pis_cofins_credit'.
    Responda APENAS com o objeto JSON.
  `;
  
  const prompt = `Traduza a seguinte regra: "${naturalLanguageRule}"`;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{text: prompt}] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });
    return response.text || "{}";
  } catch (error) {
    console.error("Mapping Agent Error:", error);
    return JSON.stringify({ error: "Erro ao traduzir a regra." });
  }
};


// --- ARQUITETURA DE IA OPERACIONAL (FUNCTION CALLING) ---

// 1. Declaração das "Ferramentas" que a IA pode usar.
// Isso é o "menu de opções" que o Gemini vai ler para decidir qual função chamar.
const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'getDocumentsByPeriod',
    description: 'Busca um resumo dos documentos fiscais (NF-e, etc.) de um período específico para uma empresa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        competence: { type: 'STRING', description: 'O período no formato "MM/YYYY", ex: "03/2024".' },
        companyId: { type: 'STRING', description: 'O ID da empresa que está sendo analisada.' },
      },
      required: ['competence', 'companyId'],
    },
  },
  {
    name: 'runSpedValidationForCompany',
    description: 'Executa uma validação de conformidade (similar ao PVA da Receita) nos documentos de um período, retornando uma lista de erros e avisos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        competence: { type: 'STRING', description: 'O período no formato "MM/YYYY", ex: "03/2024".' },
        companyId: { type: 'STRING', description: 'O ID da empresa.' },
      },
      required: ['competence', 'companyId'],
    },
  },
  {
    name: 'executeMonthlyClosing',
    description: 'Dispara o processo de fechamento contábil e fiscal de um mês para uma empresa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        competence: { type: 'STRING', description: 'O período a ser fechado no formato "MM/YYYY", ex: "11/2023".' },
        companyId: { type: 'STRING', description: 'O ID da empresa.' },
      },
      required: ['competence', 'companyId'],
    },
  },
];

const tools: Tool[] = [{ functionDeclarations: toolDeclarations }];


// 2. O Novo Agente Mestre (Operacional)
// Este agente gerencia o ciclo de conversação e o uso das ferramentas.
export const runOperationalAgent = async (
  message: string, 
  history: ChatMessage[],
  companyId: string
): Promise<GenerateContentResponse> => {
  if (!apiKey) {
    throw new Error("API Key not configured");
  }

  const systemInstruction = `
    Você é o Copiloto IA da ContaFlux LR, um agente autônomo e proativo.
    Sua função é ajudar contadores a gerenciar suas tarefas fiscais.
    Você tem acesso a um conjunto de ferramentas para buscar dados e executar ações no sistema.
    Ao receber uma pergunta, primeiro pense se precisa de alguma ferramenta para respondê-la.
    Se precisar, chame a ferramenta apropriada. Se não, responda diretamente.
    Sempre inclua o companyId '${companyId}' em todas as chamadas de função.
    Seja conciso, profissional e operacional.
  `;

  // Mapeia o histórico do chat para o formato que o Gemini espera
  const geminiHistory = history.map(msg => ({
    role: msg.role,
    parts: msg.tool_calls ? [{ functionCall: msg.tool_calls[0] }] : msg.tool_outputs ? msg.tool_outputs.map(output => ({ functionResponse: output })) : [{ text: msg.text }]
  })).flat();
  

  const contents = [...geminiHistory, { role: 'user', parts: [{text: message}] }];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents as any,
      tools,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response;
  } catch (error) {
    console.error("Operational Agent Error:", error);
    throw new Error("Erro ao se comunicar com o agente operacional.");
  }
};