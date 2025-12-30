import { ERPProvider } from './ERPProvider';
import { Company, FiscalDocument, ERPType } from '../../types';
import { normalizeInvoice } from './mappers/normalizeInvoice';
import { normalizeNFeXML } from './mappers/normalizeNFeXML';
import { normalizeServiceInvoice } from './mappers/normalizeServiceInvoice';
import { BlingProvider } from './providers/BlingProvider';
import { ContaAzulProvider } from './providers/ContaAzulProvider';
import { OmieProvider } from './providers/OmieProvider';
import { TinyProvider } from './providers/TinyProvider';
import { documentService } from '../../services/supabaseClient';

interface SyncResult {
    success: boolean;
    message: string;
    addedCount: number;
}

/**
 * The single entry point for all ERP integrations.
 * It selects the correct provider and orchestrates the data synchronization and normalization pipeline.
 */
export class ERPService {
    private provider: ERPProvider;

    constructor(erpType: ERPType) {
        this.provider = this.getProvider(erpType);
    }

    private getProvider(erpType: ERPType): ERPProvider {
        switch (erpType) {
            case 'ContaAzul': return new ContaAzulProvider();
            case 'Bling': return new BlingProvider();
            case 'Omie': return new OmieProvider();
            case 'Tiny': return new TinyProvider();
            default: throw new Error(`ERP provider for ${erpType} not found.`);
        }
    }

    /**
     * Executes a full data synchronization for a given company and period.
     * Fetches from ERP, normalizes, and saves to the database.
     */
    public async syncPeriod(company: Company, startDate: string, endDate: string): Promise<SyncResult> {
        if (!company.erp_integration) {
            return { success: false, message: "Company has no ERP integration configured.", addedCount: 0 };
        }
        
        console.log(`Starting sync for ${company.name} from ${startDate} to ${endDate} via ${company.erp_integration.type}`);

        try {
            // In a real app, we would handle auth and token refresh here.
            // await this.provider.authenticate();
            
            const fetchParams = { startDate, endDate };
            
            // 1. Fetch raw data from provider
            const [rawInvoices, rawXMLs, rawServiceInvoices] = await Promise.all([
                this.provider.fetchInvoices(fetchParams),
                this.provider.fetchNFeXML(fetchParams),
                this.provider.fetchServiceInvoices(fetchParams)
            ]);

            // 2. Normalize all fetched data
            const normalizedDocs: FiscalDocument[] = [];
            
            rawInvoices.map(inv => normalizeInvoice(inv, company.id)).forEach(doc => doc && normalizedDocs.push(doc));
            rawXMLs.map(xml => normalizeNFeXML(xml, company.id)).forEach(doc => doc && normalizedDocs.push(doc));
            rawServiceInvoices.map(srv => normalizeServiceInvoice(srv, company.id)).forEach(doc => doc && normalizedDocs.push(doc));

            // 3. De-duplication (simple version based on access key or other unique identifiers)
            // In a real app, we'd query existing docs from `documentService` first.
            const uniqueDocs = Array.from(new Map(normalizedDocs.map(doc => [doc.access_key || doc.name, doc])).values());

            // 4. Save to our database
            for (const doc of uniqueDocs) {
                // Using a retry mechanism would be ideal here.
                await documentService.create(doc);
            }

            const message = `Sync completed successfully. Found ${uniqueDocs.length} new documents.`;
            console.log(message);
            return { success: true, message, addedCount: uniqueDocs.length };

        } catch (error) {
            console.error(`[ERPService] Sync failed for ${company.name}:`, error);
            return { success: false, message: (error as Error).message || "An unknown error occurred during sync.", addedCount: 0 };
        }
    }
}