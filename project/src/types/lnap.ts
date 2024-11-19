export interface TokenMetadata {
  amountPaid: number;
  issuedAt: number;
  expiresAt: number;
  paymentHash: string;
}

export interface AuthInitResponse {
  paymentHash: string;
  invoice: string;
}

export interface AuthVerifyResponse {
  token: string;
  metadata: TokenMetadata;
}

export interface ProtectedResponse {
  message: string;
}