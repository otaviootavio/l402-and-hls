import { createInvoice, getInvoice, type AuthenticatedLnd } from "lightning";
import type { RetryService } from "./retry";
import { L402Error } from "../middleware/l402/L402Error";
import type { L402Logger } from "../middleware/l402/types/logger";

export class LNDService {
  constructor(
    private readonly lnd: AuthenticatedLnd,
    private readonly retryService: RetryService,
    private readonly logger: L402Logger
  ) {}

  async createInvoice(
    amount: number,
    description: string
  ): Promise<{ id: string; request: string }> {
    return this.retryService.retry(() =>
      createInvoice({
        lnd: this.lnd,
        tokens: amount,
        description,
      })
    );
  }

  async verifyPayment(paymentHash: string): Promise<boolean> {
    try {
      const invoice = await this.retryService.retry(() =>
        getInvoice({
          lnd: this.lnd,
          id: paymentHash,
        })
      );

      return invoice.is_confirmed;
    } catch (error) {
      this.logger.error(
        "PAYMENT_VERIFICATION_FAILED",
        "Failed to verify payment",
        {
          error,
          paymentHash,
        }
      );
      throw new L402Error(
        "Failed to verify payment",
        "PAYMENT_VERIFICATION_FAILED",
        400,
        error
      );
    }
  }
}
