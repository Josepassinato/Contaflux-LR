
import { FiscalDocument, ValidationIssue } from "../types";
import { CREDIT_CSTS } from "./taxEngine";

export const validatorService = {
    /**
     * Executa bateria de validações (Regras SPED EFD ICMS/IPI e Contribuições)
     */
    validateSped: (documents: FiscalDocument[]): ValidationIssue[] => {
        const issues: ValidationIssue[] = [];

        if (documents.length === 0) {
            issues.push({
                code: 'DOC_EMPTY',
                severity: 'error',
                message: 'Nenhum documento fiscal importado para a competência.'
            });
            return issues;
        }

        documents.forEach(doc => {
            // 1. Validação de Chave de Acesso (44 dígitos)
            if (!doc.access_key || doc.access_key.length !== 44) {
                issues.push({
                    code: 'INVALID_KEY',
                    severity: 'error',
                    message: `Chave de acesso inválida ou ausente.`,
                    details: `Doc: ${doc.name}`
                });
            }

            // 2. Validação de Participante (CNPJ)
            if (!doc.issuer_cnpj || doc.issuer_cnpj.length < 14) {
                issues.push({
                    code: 'INVALID_CNPJ',
                    severity: 'error',
                    message: `CNPJ do emitente inválido.`,
                    details: `Doc: ${doc.name} - ${doc.issuer_name}`
                });
            }

            // 3. Validação de Itens
            if (!doc.items || doc.items.length === 0) {
                issues.push({
                    code: 'NO_ITEMS',
                    severity: 'warning',
                    message: `Documento sem itens (produtos/serviços) vinculados.`,
                    details: `Doc: ${doc.name}`
                });
            } else {
                doc.items.forEach(item => {
                    // 3.1 NCM Obrigatório (Regra SPED 0200)
                    if (!item.ncm || item.ncm.length < 8 || item.ncm === '00000000') {
                        issues.push({
                            code: 'INVALID_NCM',
                            severity: 'warning',
                            message: `Produto com NCM inválido ou genérico. Risco de rejeição no C170.`,
                            details: `Item: ${item.name} (Doc: ${doc.access_key?.substring(0,10)}...)`
                        });
                    }

                    // 3.2 Coerência CST x Alíquota (PIS/COFINS)
                    const cst = item.cstPis || item.cstCofins || '';
                    const hasRate = (item.pPIS && item.pPIS > 0) || (item.pCOFINS && item.pCOFINS > 0);
                    
                    // Erro Comum: CST de Crédito (50-66) mas com Alíquota Zero
                    if (CREDIT_CSTS.includes(cst) && !hasRate && doc.operation_type === 'entry') {
                        issues.push({
                            code: 'CST_RATE_MISMATCH',
                            severity: 'error',
                            message: `Inconsistência: CST ${cst} (Direito a Crédito) informado com Alíquota Zero.`,
                            details: `Item: ${item.name} - Valor: ${item.amount}`
                        });
                    }

                    // Erro Comum: CST de Saída Tributada (01, 02) com valor de imposto zerado
                    if (doc.operation_type === 'exit' && ['01', '02'].includes(cst) && !hasRate) {
                         issues.push({
                            code: 'EXIT_TAX_ERROR',
                            severity: 'error',
                            message: `Inconsistência: Saída Tributada (CST ${cst}) sem destaque de alíquota.`,
                            details: `Item: ${item.name}`
                        });
                    }
                });
            }
        });

        // 4. Validação de Sequência Temporal (Apenas Warning)
        // (Simplificado para MVP: Verifica se há docs de múltiplos meses misturados)
        const months = new Set(documents.map(d => d.date.substring(0, 7))); // YYYY-MM
        if (months.size > 1) {
            issues.push({
                code: 'MULTIPLE_PERIODS',
                severity: 'warning',
                message: `Existem documentos de competências diferentes (${Array.from(months).join(', ')}). O SPED deve ser mensal.`,
            });
        }

        return issues;
    }
};
