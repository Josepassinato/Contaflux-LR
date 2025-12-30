import { Company } from '../types';

// Base de regras padrão para o Lucro Real
const defaultRules = {
  pisCofins: {
    pisRate: 0.0165,
    cofinsRate: 0.076,
    creditCsts: ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66'],
  },
  irpjCsll: {
    irpjRate: 0.15,
    csllRate: 0.09,
    additionalRate: 0.10,
    additionalThreshold: 20000, // Mensal
    lossOffsetLimit: 0.30,
  }
};

/**
 * Motor de Regras Fiscais
 * Retorna o conjunto de regras aplicável com base no perfil da empresa.
 */
export const taxRules = {
  getApplicableRules: (company?: Company) => {
    // Começa com uma cópia profunda das regras padrão para evitar mutações.
    const rules = JSON.parse(JSON.stringify(defaultRules));

    if (company?.tax_profile?.isMonofasico) {
      // Exemplo de regra customizada: se for monofásico, zera a alíquota de saída.
      // A lógica de crédito seria mais complexa, mas isso demonstra a flexibilidade.
      rules.pisCofins.pisRate = 0;
      rules.pisCofins.cofinsRate = 0;
    }

    // Outras regras podem ser adicionadas aqui com base no CNAE, industry_type, etc.
    // Ex: if (company?.tax_profile?.industryType === 'servicos_hospitalares') {
    //   rules.irpjCsll.basePresuncao = 0.08;
    // }

    return rules;
  }
};
