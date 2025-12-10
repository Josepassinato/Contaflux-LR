import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { TaxCalculationResult, InvestmentSuggestion, AILearning } from "../types";
import { searchLegalContext } from "./knowledgeBase";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * AGENTE 1: ESTRATEGISTA TRIBUTÁRIO
 * Foco: Comparativo de Regimes e Planejamento Financeiro.
 */
const runStrategistAgent = async (result: TaxCalculationResult): Promise<string> => {
  if (!result.comparison) return "";

  const prompt = `
    ATUE COMO: Consultor Estratégico Tributário Sênior.
    OBJETIVO: Analisar a viabilidade econômica entre Lucro Real vs. Lucro Presumido.

    [DADOS DO CENÁRIO]
    - Regime Atual Calculado: Lucro Real
    - Custo Total Lucro Real: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.comparison.real.totalTax)} (Carga Efetiva: ${result.comparison.real.effectiveRate.toFixed(2)}%)
    - Custo Estimado Presumido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.comparison.presumido.totalTax)} (Carga Efetiva: ${result.comparison.presumido.effectiveRate.toFixed(2)}%)
    - Economia Estimada (Saving): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.comparison.savings)}
    - Melhor Opção Matemática: ${result.comparison.bestRegime}

    INSTRUÇÕES:
    1. Seja direto. Valide se a escolha pelo Lucro Real está se pagando.
    2. Se o Lucro Real for vantajoso, explique se é devido à margem de lucro apertada (IRPJ baixo) ou alto volume de créditos (PIS/COFINS).
    3. Use tom executivo, focado em "Bottom Line" (Resultado Final).
    
    Limitar resposta a 4 linhas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.2 }
    });
    return response.text || "";
  } catch (e) {
    console.error("Strategist Agent Error", e);
    return "Análise estratégica indisponível no momento.";
  }
};

/**
 * AGENTE 2: AUDITOR DE PIS/COFINS
 * Foco: Análise técnica da não-cumulatividade e consistência de créditos.
 */
const runAuditorAgent = async (result: TaxCalculationResult, learnings: AILearning[] = []): Promise<string> => {
  let learningInjection = "";
  if (learnings && learnings.length > 0) {
    const formattedLearnings = learnings.map(l => 
        `- Para um item com contexto ${JSON.stringify(l.context)}, a correção aplicada foi ${JSON.stringify(l.corrected_value)} (Justificativa: ${l.justification}).`
    ).join('\n');
    learningInjection = `
    [DIRETIVAS APRENDIDAS PARA ESTA EMPRESA - SIGA COM PRIORIDADE MÁXIMA]
    ${formattedLearnings}
    [FIM DAS DIRETIVAS]
    `;
  }

  const prompt = `
    ATUE COMO: Auditor Fiscal Especialista em PIS/COFINS Não-Cumulativo.
    OBJETIVO: Validar a coerência da apuração de contribuições sociais, considerando as correções prévias do contador.
    ${learningInjection}
    [DADOS DA APURAÇÃO]
    - Total de Débitos (Vendas): PIS R$ ${result.pisDebits.toFixed(2)} | COFINS R$ ${result.cofinsDebits.toFixed(2)}
    - Total de Créditos (Insumos): PIS R$ ${result.pisCredits.toFixed(2)} | COFINS R$ ${result.cofinsCredits.toFixed(2)}
    - Total a Pagar: PIS R$ ${result.pis.toFixed(2)} | COFINS R$ ${result.cofins.toFixed(2)}

    INSTRUÇÕES:
    1. Analise a proporção Débito/Crédito. Se os créditos forem muito altos (>80% dos débitos), alerte para risco de malha fina e necessidade de revisão de CSTs, a menos que as DIRETIVAS APRENDIDAS justifiquem isso.
    2. Se os créditos forem zerados, questione se a empresa esqueceu de classificar insumos (CST 50-66).
    3. Foco puramente técnico na Lei 10.833/03.

    Limitar resposta a 4 linhas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });
    return response.text || "";
  } catch (e) {
    return "Auditoria PIS/COFINS indisponível.";
  }
};

/**
 * AGENTE 3: ESPECIALISTA EM SPED & COMPLIANCE
 * Foco: Riscos operacionais na entrega das obrigações acessórias.
 */
const runComplianceAgent = async (result: TaxCalculationResult): Promise<string> => {
  const prompt = `
    ATUE COMO: Especialista em SPED (Sistema Público de Escrituração Digital).
    OBJETIVO: Alertar sobre cruzamento de dados ECF x EFD Contribuições.

    [DADOS DE IRPJ/CSLL]
    - Lucro Real Ajustado (Base): R$ ${result.realProfit.toFixed(2)}
    - Prejuízo Compensado: R$ ${result.offset.toFixed(2)}
    - Adicional de IRPJ: R$ ${result.irpjAdicional.toFixed(2)}

    INSTRUÇÕES:
    1. Se houve compensação de prejuízo, lembre de verificar o saldo no Registro M010 do LALUR (ECF).
    2. Se houve Adicional de IRPJ, alerte para o código de receita correto no DARF.
    3. Dê uma dica de ouro para evitar divergência entre o SPED Contribuições (Bloco M) e a DCTFWeb.

    Limitar resposta a 3 linhas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.2 }
    });
    return response.text || "";
  } catch (e) {
    return "Análise de Compliance indisponível.";
  }
};

/**
 * AGENTE 4: RADAR DE BENEFÍCIOS FISCAIS
 * Foco: Sugerir investimentos que abatem o IRPJ/CSLL.
 * Retorna JSON estruturado.
 */
export const runBenefitRadarAgent = async (result: TaxCalculationResult): Promise<InvestmentSuggestion[]> => {
  if (!apiKey) return [];

  const prompt = `
    ATUE COMO: Consultor de Inteligência Fiscal e Reinvestimento.
    OBJETIVO: Sugerir 3 investimentos estratégicos que podem ser deduzidos como Despesa Operacional no Lucro Real, reduzindo a base de cálculo de IRPJ e CSLL.

    [DADOS FINANCEIROS]
    - Lucro Real Atual: R$ ${result.realProfit.toFixed(2)}
    - IRPJ+CSLL Estimados (sem deduções novas): R$ ${(result.irpj + result.csll + result.irpjAdicional).toFixed(2)}

    REGRAS:
    1. Sugira investimentos nas áreas: Inovação (Tech), Treinamento (RH) e Marketing.
    2. O valor sugerido deve ser proporcional ao lucro (entre 5% a 15% do lucro).
    3. Calcule a economia fiscal estimada (aprox 34% sobre o valor investido: 15% IRPJ + 10% Adicional + 9% CSLL).
    4. Baseie-se na Lei do Bem ou RIR/2018 (Despesas Necessárias).

    FORMATO DE SAÍDA JSON (ARRAY ESTRITO, SEM TEXTO ADICIONAL):
    [
      {
        "id": "1",
        "category": "training",
        "title": "Capacitação de Equipe",
        "description": "Treinamento técnico...",
        "suggestedAmount": 15000,
        "estimatedTaxSaving": 5100,
        "legalBasis": "Art. 360 RIR/2018",
        "impact": "high"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text) as InvestmentSuggestion[];
  } catch (e) {
    console.error("Benefit Radar Error", e);
    return [];
  }
};

/**
 * ORQUESTRADOR DE AGENTES
 * Coordena a chamada paralela e formata o relatório final.
 */
export const analyzeTaxScenario = async (result: TaxCalculationResult, learnings: AILearning[] = []): Promise<string> => {
  if (!apiKey) {
    return "⚠️ Análise de IA indisponível (Chave de API não configurada). Os valores apresentados acima são do Motor Fiscal Determinístico.";
  }

  try {
    // Execução Paralela para Alta Performance
    const [strategyAnalysis, auditorAnalysis, complianceAnalysis] = await Promise.all([
      runStrategistAgent(result),
      runAuditorAgent(result, learnings),
      runComplianceAgent(result)
    ]);

    // Montagem do Relatório Consolidado
    return `
📊 **ANÁLISE ESTRATÉGICA (Regime)**
${strategyAnalysis.trim()}

🔍 **AUDITORIA PIS/COFINS (Não-Cumulatividade)**
${auditorAnalysis.trim()}

🛡️ **COMPLIANCE & SPED**
${complianceAnalysis.trim()}
    `.trim();

  } catch (error) {
    console.error("Orchestrator Error:", error);
    return "Não foi possível gerar a análise completa dos agentes. Verifique a conexão.";
  }
};

export const chatWithLegalExpert = async (message: string, history: {role: string, parts: {text: string}[]}[]): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key not configured");
  }

  // RAG: Retrieval of Legal Context
  const legalContext = searchLegalContext(message);
  
  let ragInjection = "";
  if (legalContext) {
      ragInjection = `
      [CONTEXTO LEGAL RECUPERADO - RAG SIMULADO]
      Use as informações abaixo como fonte de verdade para fundamentar sua resposta:
      ${legalContext}
      [FIM DO CONTEXTO]
      `;
  }

  const systemInstruction = `
    Você é o Assistente Virtual da ContaFlux LR, um especialista em legislação tributária brasileira (Lucro Real, PIS/COFINS, SPED, ECF/ECD).
    Responda dúvidas de contadores de forma técnica, citando bases legais (Leis, Instruções Normativas da RFB) quando aplicável.
    Considere a legislação vigente e as mudanças previstas para 2025/2026 (Reforma Tributária IBS/CBS se perguntado).
    Seja conciso e direto.
    ${ragInjection}
  `;

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      history: history as any
    });

    const result = await chat.sendMessage({
      message: message
    });

    return result.text || "Não foi possível processar sua resposta.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Desculpe, ocorreu um erro ao consultar a legislação.";
  }
};
