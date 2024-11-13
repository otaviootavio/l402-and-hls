import type { L402Token } from "./token";

export interface L402Storage {
  getTokenUsage(paymentHash: string): Promise<number>;
  incrementTokenUsage(paymentHash: string): Promise<number>;
  recordToken(token: L402Token): Promise<void>;
  isTokenRevoked(paymentHash: string): Promise<boolean>;
  revokeToken(paymentHash: string): Promise<void>;
  getMetrics?(): Promise<L402StorageMetrics>;
}

export interface L402StorageMetrics {
  activeTokens: number;
  revokedTokens: number;
  totalPayments: number;
}
