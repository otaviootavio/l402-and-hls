import type { CreateInvoiceParams, GetInvoiceParams, Invoice, LNInvoice, PaymentVerification, TokenMetadata } from "./types";

export interface ILightningService {
  generateInvoice(amount: number, expiryMinutes: number): Promise<LNInvoice>;
  verifyPayment(verification: PaymentVerification): Promise<boolean>;
  getInvoice(params: GetInvoiceParams): Promise<Invoice>;
}

export interface IBaseLightningService {
  createInvoice(params: CreateInvoiceParams): Promise<Invoice>;
  getInvoice(params: GetInvoiceParams): Promise<Invoice>;
}


export interface ILightningService {
  generateInvoice(amount: number, expiryMinutes: number): Promise<LNInvoice>;
  verifyPayment(verification: PaymentVerification): Promise<boolean>;
}

export interface ITokenService {
  generateToken(metadata: TokenMetadata): string;
  verifyToken(token: string): boolean;
}
