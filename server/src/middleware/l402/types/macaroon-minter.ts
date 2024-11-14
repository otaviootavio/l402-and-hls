import type { SignedMacaroonData } from "./token";

export interface MacaroonMinterConfig {
  secret: string;
  keyId: string;
  defaultExpirySeconds: number;
  defaultMaxUses: number;
}

export interface MacaroonMintResult {
  macaroon: string;
  paymentHash: string;
}

export interface MacaroonMinterVerifyResult {
  isValid: boolean;
  data: SignedMacaroonData | null;
}

export interface MacaroonMinter {
  mint(params: {
    paymentHash: string;
    expiryTime?: number;
    maxUses?: number;
    metadata?: Record<string, unknown>;
  }): MacaroonMintResult;

  verify(params: {
    macaroon: string;
    preimage: string;
  }): MacaroonMinterVerifyResult;

  revoke(paymentHash: string): Promise<void>;
}
