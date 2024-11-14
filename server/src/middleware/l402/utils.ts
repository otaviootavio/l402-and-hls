import { createInvoice, getInvoice, type AuthenticatedLnd } from "lightning";
import type { InvoiceService } from "./l402";
import type { Invoice } from "./l402";

export const createLightningService = (lnd: AuthenticatedLnd): InvoiceService => ({
    async createInvoice(params: { tokens: number; description: string }): Promise<Invoice> {
        const result = await createInvoice({ ...params, lnd });
        return {
            id: result.id,
            request: result.request,
            is_confirmed: false
        };
    },

    async getInvoice(params: { id: string }): Promise<Invoice> {
        const result = await getInvoice({ ...params, lnd });
        return {
            id: result.id,
            request: result.request ?? '',
            is_confirmed: result.is_confirmed
        };
    }
});
