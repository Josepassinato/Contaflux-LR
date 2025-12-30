import { FiscalDocument, InvoiceItem, RawXML } from "../../../types";

// Helper functions from Documents.tsx (could be moved to a shared util)
const getTagValue = (parent: Element, tagName: string): number => {
    const el = parent.getElementsByTagName(tagName)[0];
    return el ? parseFloat(el.textContent || "0") : 0;
};
const getTagText = (parent: Element, tagName: string): string => {
    const el = parent.getElementsByTagName(tagName)[0];
    return el ? el.textContent || "" : "";
};

export function normalizeNFeXML(rawXML: RawXML, companyId: string): FiscalDocument | null {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rawXML.conteudo_xml, "text/xml");
        
        const nfeNode = xmlDoc.getElementsByTagName("NFe")[0];
        if (!nfeNode) return null;

        const infNFe = nfeNode.getElementsByTagName("infNFe")[0];
        if (!infNFe) return null;
        
        const ide = infNFe.getElementsByTagName("ide")[0];
        const emit = infNFe.getElementsByTagName("emit")[0];
        const totalNode = infNFe.getElementsByTagName("total")[0];
        if (!totalNode) return null;
        const total = totalNode.getElementsByTagName("ICMSTot")[0];
        if (!total) return null;


        const accessKey = rawXML.chave_acesso;
        const dhEmi = getTagText(ide, "dhEmi");
        const vNF = getTagValue(total, "vNF");
        const emitCNPJ = getTagText(emit, "CNPJ");
        const emitName = getTagText(emit, "xNome");
        
        const dets = infNFe.getElementsByTagName("det");
        const items: InvoiceItem[] = [];
        
        let operationType: 'entry' | 'exit' = 'entry'; 

        for (let i = 0; i < dets.length; i++) {
            const det = dets[i];
            const prod = det.getElementsByTagName("prod")[0];
            const imposto = det.getElementsByTagName("imposto")[0];
            const cfop = getTagText(prod, "CFOP");
            
            if (i === 0 && ['5', '6', '7'].includes(cfop.charAt(0))) {
                operationType = 'exit';
            }

            const icmsNode = imposto.getElementsByTagName("ICMS")[0]?.firstElementChild; //e.g. ICMS00
            const pisNode = imposto.getElementsByTagName("PIS")[0]?.firstElementChild;
            const cofinsNode = imposto.getElementsByTagName("COFINS")[0]?.firstElementChild;
            const ipiNode = imposto.getElementsByTagName("IPI")[0]?.firstElementChild;

            items.push({
                name: getTagText(prod, "xProd"),
                ncm: getTagText(prod, "NCM"),
                cfop,
                cst: icmsNode ? getTagText(icmsNode, "CST") : '',
                cstPis: pisNode ? getTagText(pisNode, "CST") : '',
                cstCofins: cofinsNode ? getTagText(cofinsNode, "CST") : '',
                amount: getTagValue(prod, "vProd"),
                vICMS: icmsNode ? getTagValue(icmsNode, "vICMS") : 0,
                pICMS: icmsNode ? getTagValue(icmsNode, "pICMS") : 0,
                vPIS: pisNode ? getTagValue(pisNode, "vPIS") : 0,
                pPIS: pisNode ? getTagValue(pisNode, "pPIS") : 0,
                vCOFINS: cofinsNode ? getTagValue(cofinsNode, "vCOFINS") : 0,
                pCOFINS: cofinsNode ? getTagValue(cofinsNode, "pCOFINS") : 0,
                vIPI: ipiNode ? getTagValue(ipiNode, "vIPI") : 0,
                pIPI: ipiNode ? getTagValue(ipiNode, "pIPI") : 0,
            });
        }

        return {
            id: '', // DB will generate
            company_id: companyId,
            name: `NFe_${accessKey.substring(22, 31)}.xml`,
            type: 'NFe',
            operation_type: operationType,
            date: dhEmi.split('T')[0],
            status: 'processing',
            confidence: 0.9, // Lower confidence as it's from ERP, not Sefaz
            amount: vNF,
            items: items,
            xml_content: rawXML.conteudo_xml,
            access_key: accessKey,
            issuer_cnpj: emitCNPJ,
            issuer_name: emitName,
            total_icms: getTagValue(total, "vICMS"),
            total_pis: getTagValue(total, "vPIS"),
            total_cofins: getTagValue(total, "vCOFINS"),
            total_ipi: getTagValue(total, "vIPI"),
        };

    } catch (error) {
        console.error("Failed to normalize NFe XML:", error, rawXML);
        return null;
    }
}