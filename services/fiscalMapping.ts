// services/fiscalMapping.ts

/**
 * Este arquivo serve como a "Fonte da Verdade" para códigos e descrições fiscais.
 * Em um sistema de produção, isso seria alimentado por um banco de dados ou uma API de compliance
 * que é atualizada constantemente. Para o MVP, centralizamos aqui para garantir
 * consistência, auditabilidade e explicabilidade.
 */

export const CFOP_DESCRIPTIONS: Record<string, string> = {
    // Vendas (Saídas)
    '5101': 'Venda de produção do estabelecimento',
    '5102': 'Venda de mercadoria adquirida ou recebida de terceiros',
    '5405': 'Venda de mercadoria adquirida com ST, na condição de contribuinte substituído',
    '5933': 'Prestação de serviço tributado pelo ISSQN',
    '6102': 'Venda de mercadoria adquirida de terceiros - Fora do Estado',

    // Compras (Entradas)
    '1101': 'Compra para industrialização',
    '1102': 'Compra para comercialização',
    '1556': 'Compra de material para uso ou consumo',
    '1933': 'Aquisição de serviço tributado pelo ISSQN',
    '1949': 'Outra entrada de mercadoria ou prestação de serviço não especificada',
    '2102': 'Compra para comercialização - Fora do Estado',
};

export const CST_ICMS_DESCRIPTIONS: Record<string, string> = {
    '00': 'Tributada integralmente',
    '10': 'Tributada e com cobrança do ICMS por substituição tributária',
    '20': 'Com redução de base de cálculo',
    '40': 'Isenta',
    '41': 'Não tributada',
    '51': 'Diferimento',
    '60': 'ICMS cobrado anteriormente por substituição tributária',
    '90': 'Outras',
};

export const CST_PIS_COFINS_DESCRIPTIONS: Record<string, string> = {
    // Saídas
    '01': 'Operação Tributável com Alíquota Básica',
    '02': 'Operação Tributável com Alíquota Diferenciada',
    '04': 'Operação Tributável Monofásica - Revenda a Alíquota Zero',
    '06': 'Operação Tributável a Alíquota Zero',
    '08': 'Operação sem Incidência da Contribuição',

    // Entradas com Crédito
    '50': 'Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno',
    '51': 'Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não Tributada no Mercado Interno',
    '53': 'Operação com Direito a Crédito - Vinculada a Receitas de Exportação',
    '60': 'Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Tributada no Mercado Interno',

    // Entradas sem Crédito
    '70': 'Operação de Aquisição sem Direito a Crédito',
    '73': 'Operação de Aquisição com Isenção',

    // Outras
    '99': 'Outras Operações',
};

export const fiscalMapping = {
    getCFOPDescription: (code: string) => CFOP_DESCRIPTIONS[code] || 'CFOP Desconhecido',
    getCSTDescription: (code: string, type: 'ICMS' | 'PIS_COFINS') => {
        if (type === 'ICMS') {
            return CST_ICMS_DESCRIPTIONS[code] || 'CST ICMS Desconhecido';
        }
        return CST_PIS_COFINS_DESCRIPTIONS[code] || 'CST PIS/COFINS Desconhecido';
    }
};
