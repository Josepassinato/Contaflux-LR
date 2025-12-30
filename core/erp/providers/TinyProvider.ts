import { ERPProvider } from '../ERPProvider';
import { AuthResponse, FetchParams, RawInvoice, RawXML, RawServiceInvoice, CompanyMetadata } from '../../../types';

// MOCK/PLACEHOLDER IMPLEMENTATION
export class TinyProvider implements ERPProvider {
    async authenticate(): Promise<AuthResponse> { throw new Error("TinyProvider not implemented."); }
    async refreshToken(): Promise<AuthResponse> { throw new Error("TinyProvider not implemented."); }
    async fetchInvoices(params: FetchParams): Promise<RawInvoice[]> { throw new Error("TinyProvider not implemented."); }
    async fetchNFeXML(params: FetchParams): Promise<RawXML[]> { throw new Error("TinyProvider not implemented."); }
    async fetchServiceInvoices(params: FetchParams): Promise<RawServiceInvoice[]> { throw new Error("TinyProvider not implemented."); }
    async getCompanyMetadata(): Promise<CompanyMetadata> { throw new Error("TinyProvider not implemented."); }
}