
export interface LegalTopic {
    id: string;
    keywords: string[];
    content: string;
    source: string;
}

export const LEGAL_KNOWLEDGE_BASE: LegalTopic[] = [
    {
        id: 'pis_cofins_creditos',
        keywords: ['pis', 'cofins', 'crédito', 'credito', 'insumo', 'essencialidade', 'não-cumulativo', 'nao cumulativo'],
        source: 'Lei 10.833/2003, Art. 3º',
        content: `
        Do valor a pagar, a pessoa jurídica poderá descontar créditos calculados em relação a:
        I - bens adquiridos para revenda;
        II - bens e serviços, utilizados como insumo na prestação de serviços e na produção ou fabricação de bens ou produtos destinados à venda, inclusive combustíveis e lubrificantes;
        III - energia elétrica e energia térmica, inclusive vapor, consumidas nos estabelecimentos da pessoa jurídica;
        IV - aluguéis de prédios, máquinas e equipamentos, pagos a pessoa jurídica, utilizados nas atividades da empresa;
        VI - máquinas, equipamentos e outros bens incorporados ao ativo imobilizado, adquiridos ou fabricados para locação a terceiros, ou para utilização na produção de bens destinados à venda ou na prestação de serviços.
        Nota: O conceito de insumo foi ampliado pelo STJ (Tema 779) considerando a critérios de essencialidade e relevância.
        `
    },
    {
        id: 'lucro_real_trimestral',
        keywords: ['lucro real', 'trimestral', 'irpj', 'csll', 'adicional', 'alíquota', 'aliquota'],
        source: 'RIR/2018 e Lei 9.430/1996',
        content: `
        A apuração do Lucro Real Trimestral encerra-se em 31 de março, 30 de junho, 30 de setembro e 31 de dezembro.
        Alíquotas:
        - IRPJ: 15% sobre o Lucro Real.
        - Adicional IRPJ: 10% sobre a parcela do lucro que exceder R$ 20.000,00 ao mês (ou R$ 60.000,00 no trimestre).
        - CSLL: 9% sobre a Base de Cálculo Ajustada.
        Prejuízos Fiscais: A compensação é limitada a 30% do Lucro Real do período de apuração.
        `
    },
    {
        id: 'sped_contribuicoes',
        keywords: ['sped', 'efd', 'contribuições', 'contribuicoes', 'bloco m', 'cst', 'validacao'],
        source: 'Guia Prático EFD-Contribuições',
        content: `
        A EFD-Contribuições deve ser entregue mensalmente até o 10º dia útil do segundo mês subsequente.
        Pontos críticos:
        - Bloco M: Apuração do PIS/Pasep e da COFINS. Onde ocorre a consolidação dos créditos e débitos.
        - CSTs de Crédito (50 a 66): Devem estar vinculados a documentos de entrada válidos e alíquotas coerentes.
        - CSTs de Receita (01 a 09): Devem refletir a natureza da operação. CST 01 (Tributada Integralmente), CST 06 (Alíquota Zero).
        `
    },
    {
        id: 'presuncao_lucro_presumido',
        keywords: ['lucro presumido', 'presunção', 'presuncao', 'base de cálculo'],
        source: 'Lei 9.249/1995',
        content: `
        Percentuais de Presunção para IRPJ:
        - 8% para venda de mercadorias e produtos.
        - 1.6% para revenda de combustíveis.
        - 16% para serviços de transporte (exceto carga).
        - 32% para prestação de serviços em geral, locação de bens e intermediação de negócios.
        
        Percentuais de Presunção para CSLL:
        - 12% regra geral (comércio/indústria).
        - 32% para prestação de serviços.
        `
    }
];

export const searchLegalContext = (query: string): string => {
    const normalizedQuery = query.toLowerCase();
    
    const relevantTopics = LEGAL_KNOWLEDGE_BASE.filter(topic => 
        topic.keywords.some(k => normalizedQuery.includes(k))
    );

    if (relevantTopics.length === 0) return "";

    return relevantTopics.map(t => 
        `[FONTE: ${t.source}]\n${t.content}`
    ).join('\n\n');
};
