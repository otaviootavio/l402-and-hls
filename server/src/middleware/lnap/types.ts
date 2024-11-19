export interface Invoice {
  id: string;
  request: string;
  is_confirmed: boolean;
  paymentHash?: string;
  amount?: number;
  expiry?: number;
}

export interface CreateInvoiceParams {
  tokens: number;
  description: string;
  expiryMinutes?: number;
}

export interface GetInvoiceParams {
  id: string;
}

export interface LNInvoice {
  paymentHash: string;
  invoice: string;
  amount: number;
  expiry: number;
}

export interface LNInvoice {
  paymentHash: string;
  invoice: string;
  amount: number;
  expiry: number;
}

export interface TokenResponse {
  token: string;
  metadata: TokenMetadata;
}


export interface LNAPRequest extends Request {
  user?: TokenMetadata;
}


export interface PaymentVerification {
  paymentPreimage: string;
  paymentHash: string;
}

export interface TokenMetadata {
  amountPaid: number;
  issuedAt: number;
  expiresAt: number;
  paymentHash: string;
}

export interface LNAPConfig {
  invoiceExpiryMinutes: number;
  tokenExpiryMinutes: number;
  requiredPaymentAmount: number;
  hmacSecret: string;
}
