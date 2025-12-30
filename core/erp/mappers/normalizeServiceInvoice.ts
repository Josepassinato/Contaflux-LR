import { FiscalDocument, InvoiceItem, RawServiceInvoice } from "../../../types";

export function normalizeServiceInvoice(raw: RawServiceInvoice, companyId: string): FiscalDocument | null {
     try {
        const items: InvoiceItem[] = [{
            name: raw.descricao_servico,
            ncm: '00000000',
            cfop: '5933', // Service CFOP
            cst: '00',
            cstPis: '01',
            cstCofins: '01',
            amount: raw.valor,
            vICMS: 0, vPIS: 0, vCOFINS: 0, vIPI: 0,
        }];

        return {
            id: '',
            company_id: companyId,
            name: `NFSe_${raw.numero}.json`,
            type: 'PDF',
            operation_type: 'exit', // Assuming service invoices are always exits for now
            date: raw.data_competencia,
            status: 'processing',
            confidence: 0.8,
            amount: raw.valor,
            items: items,
            issuer_cnpj: raw.prestador.cnpj,
            issuer_name: raw.prestador.razao_social,
            total_icms: 0,
            total_pis: raw.valor * 0.0165, // Estimate
            total_cofins: raw.valor * 0.076, // Estimate
            total_ipi: 0,
        };

    } catch (error) {
        console.error("Failed to normalize Service Invoice:", error, raw);
        return null;
    }
}