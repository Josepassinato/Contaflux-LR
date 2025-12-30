import { ERPProvider } from '../ERPProvider';
import { AuthResponse, FetchParams, RawInvoice, RawXML, RawServiceInvoice, CompanyMetadata } from '../../../types';

// MOCK IMPLEMENTATION
export class BlingProvider implements ERPProvider {
    async authenticate(): Promise<AuthResponse> {
        console.log("Bling: Simulating API Key auth...");
        await new Promise(res => setTimeout(res, 500));
        return {
            access_token: 'bling_mock_access_token',
            refresh_token: 'bling_mock_refresh_token',
            expires_in: 7200,
        };
    }

    async refreshToken(): Promise<AuthResponse> {
        console.log("Bling: Simulating token refresh...");
        await new Promise(res => setTimeout(res, 300));
         return {
            access_token: 'bling_mock_new_access_token',
            refresh_token: 'bling_mock_refresh_token',
            expires_in: 7200,
        };
    }

    async fetchInvoices(params: FetchParams): Promise<RawInvoice[]> {
         console.log("Bling: Fetching invoices for period:", params);
         await new Promise(res => setTimeout(res, 1000));
         return [
             {
                id: 'bling_inv_1',
                numero: '9987',
                data_emissao: '2024-05-12',
                valor_total: 2500,
                tipo: 'ENTRADA',
                cliente_fornecedor: { nome: 'Fornecedor de Peças Bling', cnpj_cpf: '44555666000177' },
                itens: [
                    { codigo: 'PC-01', descricao: 'Componente Eletrônico X', quantidade: 50, valor_unitario: 50 }
                ]
             }
         ];
    }
    
    async fetchNFeXML(params: FetchParams): Promise<RawXML[]> {
         console.log("Bling: Fetching NFe XMLs for period:", params);
         await new Promise(res => setTimeout(res, 500));
         return [];
    }

    async fetchServiceInvoices(params: FetchParams): Promise<RawServiceInvoice[]> {
         console.log("Bling: Fetching Service Invoices for period:", params);
         await new Promise(res => setTimeout(res, 500));
        return [];
    }
    
    async getCompanyMetadata(): Promise<CompanyMetadata> {
        return {
            nome_empresarial: 'Empresa via Bling',
            cnpj: '00.111.222/0001-33',
        };
    }
}