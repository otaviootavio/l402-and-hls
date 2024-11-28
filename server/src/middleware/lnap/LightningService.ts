import { createInvoice, getInvoice, type AuthenticatedLnd } from "lightning";
import type { ILightningService } from "./interfaces";
import type {
  CreateInvoiceParams,
  Invoice,
  LNInvoice,
  PaymentVerification,
} from "./types";

import { createHash } from "crypto";

export class LightningService implements ILightningService {
  private readonly lnd: AuthenticatedLnd;

  constructor(lnd: AuthenticatedLnd) {
    this.lnd = lnd;
  }

  async generateInvoice(
    amount: number,
    expiryMinutes: number
  ): Promise<LNInvoice> {
    const result = await createInvoice({
      lnd: this.lnd,
      tokens: amount,
      description: `LNAP Authentication Payment`,
      expires_at: new Date(
        Date.now() + expiryMinutes * 60 * 1000
      ).toISOString(),
    });

    // Store the original hash from LND
    return {
      paymentHash: result.id, // Keep original hex format
      invoice: result.request,
      amount,
      expiry: Math.floor(Date.now() / 1000) + expiryMinutes * 60,
    };
  }

  async verifyPayment(verification: PaymentVerification): Promise<boolean> {
    // Case 1: If user's wallet supports preimage, they can provide both
    if (verification.paymentPreimage && verification.paymentHash) {
      // Quick cryptographic verification
      const preimageBuffer = Buffer.from(verification.paymentPreimage, "hex");
      const calculatedHash = createHash("sha256")
        .update(preimageBuffer)
        .digest("hex");

      if (calculatedHash === verification.paymentHash) {
        return true;
      }
    }

    // Case 2: Fallback for wallets that don't support preimage
    // User only provides payment hash
    if (verification.paymentHash) {
      try {
        const invoice = await getInvoice({
          lnd: this.lnd,
          id: verification.paymentHash,
        });

        return invoice.is_confirmed === true;
      } catch (error) {
        console.error("LND verification failed:", error);
        return false;
      }
    }

    return false;
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
