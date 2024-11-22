import { createInvoice, getInvoice, type AuthenticatedLnd } from "lightning";
import * as crypto from "crypto";
import type { ILightningService } from "./interfaces";
import type {
  CreateInvoiceParams,
  GetInvoiceParams,
  Invoice,
  LNInvoice,
  PaymentVerification,
} from "./types";

export class LightningService implements ILightningService {
  private readonly lnd: AuthenticatedLnd;

  constructor(lnd: AuthenticatedLnd) {
    this.lnd = lnd;
  }

  async generateInvoice(amount: number, expiryMinutes: number): Promise<LNInvoice> {
    const result = await createInvoice({
      lnd: this.lnd,
      tokens: amount,
      description: `LNAP Authentication Payment`,
      expires_at: new Date(Date.now() + (expiryMinutes * 60 * 1000)).toISOString()
    });

    // Store the original hash from LND
    return {
      paymentHash: result.id, // Keep original hex format
      invoice: result.request,
      amount,
      expiry: Math.floor(Date.now() / 1000) + (expiryMinutes * 60)
    };
  }


  async verifyPayment(verification: PaymentVerification): Promise<boolean> {
    try {
      console.log('Verification request:', {
        receivedHash: verification.paymentHash,
        receivedPreimage: verification.paymentPreimage
      });

      // Use the hash directly without conversion
      const invoice = await getInvoice({
        lnd: this.lnd,
        id: verification.paymentHash // Use original hash format
      });

      console.log('Invoice found:', {
        id: invoice.id,
        isConfirmed: invoice.is_confirmed
      });

      return invoice.is_confirmed === true;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    const result = await createInvoice({
      lnd: this.lnd,
      tokens: params.tokens,
      description: params.description,
    });

    return {
      id: result.id,
      request: result.request,
      is_confirmed: false,
      paymentHash: result.id, // Assuming id is the payment hash
      amount: params.tokens,
      expiry: params.expiryMinutes
        ? Math.floor(Date.now() / 1000) + params.expiryMinutes * 60
        : undefined,
    };
  }

  async getInvoice(params: { id: string }): Promise<Invoice> {
    const result = await getInvoice({
      lnd: this.lnd,
      id: params.id,
    });

    return {
      id: result.id,
      request: result.request || "",
      is_confirmed: result.is_confirmed,
    };
  }
}
