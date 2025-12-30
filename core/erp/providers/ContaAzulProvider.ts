import { ERPProvider } from '../ERPProvider';
import { AuthResponse, FetchParams, RawInvoice, RawXML, RawServiceInvoice, CompanyMetadata } from '../../../types';

// MOCK IMPLEMENTATION
export class ContaAzulProvider implements ERPProvider {
    async authenticate(): Promise<AuthResponse> {
        console.log("ContaAzul: Simulating OAuth flow...");
        await new Promise(res => setTimeout(res, 500));
        return {
            access_token: 'ca_mock_access_token',
            refresh_token: 'ca_mock_refresh_token',
            expires_in: 3600,
        };
    }

    async refreshToken(): Promise<AuthResponse> {
        console.log("ContaAzul: Simulating token refresh...");
        await new Promise(res => setTimeout(res, 300));
        return {
            access_token: 'ca_mock_new_access_token',
            refresh_token: 'ca_mock_refresh_token',
            expires_in: 3600,
        };
    }

    async fetchInvoices(params: FetchParams): Promise<RawInvoice[]> {
        console.log("ContaAzul: Fetching invoices for period:", params);
        await new Promise(res => setTimeout(res, 800));
        return []; // Invoices are usually represented by NFe/NFSe
    }

    async fetchNFeXML(params: FetchParams): Promise<RawXML[]> {
        console.log("ContaAzul: Fetching NFe XMLs for period:", params);
        await new Promise(res => setTimeout(res, 1200));
        // In a real scenario, call Conta Azul API
        return [
            {
                id: 'ca_nfe_1',
                chave_acesso: '35240500111222000133550010001234601000000019',
                conteudo_xml: `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe versao="4.00" Id="NFe35240500111222000133550010001234601000000019"><ide><dhEmi>2024-05-10T10:00:00-03:00</dhEmi></ide><emit><CNPJ>00111222000133</CNPJ><xNome>ContaFlux Demo S.A.</xNome></emit><dest><CNPJ>11222333000144</CNPJ><xNome>Cliente Final Ltda</xNome></dest><det nItem="1"><prod><cProd>S-01</cProd><xProd>Serviço de Implantação</xProd><NCM>69101000</NCM><CFOP>5933</CFOP><vProd>50000.00</vProd></prod><imposto><ICMS><ICMS00><CST>00</CST><vBC>50000.00</vBC><pICMS>12.00</pICMS><vICMS>6000.00</vICMS></ICMS00></ICMS><PIS><PISAliq><CST>01</CST><vBC>50000.00</vBC><pPIS>1.65</pPIS><vPIS>825.00</vPIS></PISAliq></PIS><COFINS><COFINSAliq><CST>01</CST><vBC>50000.00</vBC><pCOFINS>7.60</pCOFINS><vCOFINS>3800.00</vCOFINS></COFINSAliq></COFINS></imposto></det><total><ICMSTot><vNF>50000.00</vNF><vICMS>6000.00</vICMS><vPIS>825.00</vPIS><vCOFINS>3800.00</vCOFINS><vIPI>0</vIPI></ICMSTot></total></infNFe><protNFe><infProt><chNFe>35240500111222000133550010001234601000000019</chNFe></infProt></protNFe></nfeProc>`,
            }
        ];
    }
    
    async fetchServiceInvoices(params: FetchParams): Promise<RawServiceInvoice[]> {
        console.log("ContaAzul: Fetching Service Invoices for period:", params);
        await new Promise(res => setTimeout(res, 600));
        return [];
    }

    async getCompanyMetadata(): Promise<CompanyMetadata> {
        return {
            nome_empresarial: 'Empresa via Conta Azul',
            cnpj: '00.111.222/0001-33',
        };
    }
}