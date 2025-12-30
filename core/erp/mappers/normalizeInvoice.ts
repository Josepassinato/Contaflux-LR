import { FiscalDocument, InvoiceItem, RawInvoice } from "../../../types";

/**
 * Normalizes a generic invoice from an ERP into our internal FiscalDocument format.
 * This is a simplified version; a real one would have complex logic to map fields.
 */
export function normalizeInvoice(rawInvoice: RawInvoice, companyId: string): FiscalDocument | null {
    try {
        const items: InvoiceItem[] = rawInvoice.itens.map(item => ({
            name: item.descricao,
            ncm: '00000000', // Generic NCM, would need better mapping
            cfop: rawInvoice.tipo === 'SAIDA' ? '5102' : '1102', // Generic CFOP
            cst: '90',
            cstPis: '99',
            cstCofins: '99',
            amount: item.valor_unitario * item.quantidade,
            vICMS: 0, vPIS: 0, vCOFINS: 0, vIPI: 0, // Cannot determine from simple invoice data
        }));

        return {
            id: '', // DB will generate
            company_id: companyId,
            name: `INV_${rawInvoice.numero}.json`,
            type: 'PDF', // Treat as generic doc
            operation_type: rawInvoice.tipo === 'SAIDA' ? 'exit' : 'entry',
            date: rawInvoice.data_emissao,
            status: 'processing',
            confidence: 0.7, // Lower confidence
            amount: rawInvoice.valor_total,
            items: items,
            issuer_cnpj: rawInvoice.cliente_fornecedor.cnpj_cpf,
            issuer_name: rawInvoice.cliente_fornecedor.nome,
            total_icms: 0,
            total_pis: 0,
            total_cofins: 0,
            total_ipi: 0,
        };

    } catch (error) {
        console.error("Failed to normalize Invoice:", error, rawInvoice);
        return null;
    }
}