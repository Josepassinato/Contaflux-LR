import { AuthResponse, FetchParams, RawInvoice, RawXML, RawServiceInvoice, CompanyMetadata } from '../../types';

export interface ERPProvider {
    authenticate(): Promise<AuthResponse>;
    refreshToken(): Promise<AuthResponse>;

    fetchInvoices(params: FetchParams): Promise<RawInvoice[]>;
    fetchNFeXML(params: FetchParams): Promise<RawXML[]>;
    fetchServiceInvoices(params: FetchParams): Promise<RawServiceInvoice[]>;

    getCompanyMetadata(): Promise<CompanyMetadata>;
}