// token.ts

// Base Macaroon Types
export interface MacaroonIdentifier {
  version: number;
  tokenId: string;
  paymentHash: string;
  timestamp: string; // ISO 8601
}

export type CaveatOperator = '<' | '>' | '==' | '<=' | '>=' | '!=';

export interface CaveatCondition {
  key: string;
  operator: CaveatOperator;
  value: string | number;
}

export interface MacaroonCaveat {
  condition: CaveatCondition;
  namespace?: string;
  signature: string; // Base64 encoded HMAC
}

export interface ThirdPartyCaveat {
  location: string;
  identifier: string;
  verificationKey: string; // Base64 encoded
}

export interface Macaroon {
  identifier: string;     // Base64 encoded MacaroonIdentifier
  location: string;       // Service or domain that issued the macaroon
  caveats: MacaroonCaveat[];
  thirdPartyCaveats: ThirdPartyCaveat[];
  signature: string;      // Base64 encoded HMAC
}

// L402-specific types
export interface L402PaymentInfo {
  hash: string;
  amount: number;
  timestamp: string; // ISO 8601
}

export interface L402Restrictions {
  expiresAt: string;    // ISO 8601
  maxUses?: number;
  service: string;
  tier: number;
  capabilities: string[];
}

export interface L402Macaroon extends Macaroon {
  paymentInfo: L402PaymentInfo;
  restrictions: L402Restrictions;
}

// Minting Types
export interface MacaroonMinterConfig {
  secret: string;
  keyId: string;
  defaultExpirySeconds: number;
  serviceName: string;
  defaultTier: number;
  capabilities: string[];
}

export interface MacaroonMintResult {
  macaroon: string; // Base64 encoded L402Macaroon
  paymentHash: string;
}

export interface MacaroonVerificationResult {
  isValid: boolean;
  error?: string;
  data?: {
    macaroon: L402Macaroon;
    verifiedCaveats: {
      firstParty: MacaroonCaveat[];
      thirdParty: ThirdPartyCaveat[];
    };
  };
}

// Authorization Types
export interface MacaroonAuthContext {
  service: string;
  capability?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
  usageCount?: number;
}

export interface MacaroonAuthorizerConfig {
  serviceName: string;
  defaultTier: number;
  capabilities: string[];
}

// Service Interfaces
export interface MacaroonMinter {
  mint(params: {
    paymentHash: string;
    expiryTime?: number;
    metadata?: Record<string, unknown>;
  }): MacaroonMintResult;

  verify(params: {
    macaroon: string;
    preimage: string;
  }): MacaroonVerificationResult;

  revoke(paymentHash: string): Promise<void>;
}

export interface MacaroonAuthorizer {
  authorize(params: {
    macaroon: L402Macaroon;
    context: MacaroonAuthContext;
  }): Promise<boolean>;
}

// Builder Interface
export interface MacaroonBuilder {
  setLocation(location: string): this;
  setIdentifier(data: MacaroonIdentifier): this;
  addCaveat(condition: CaveatCondition, namespace?: string): this;
  addThirdPartyCaveat(caveat: Omit<ThirdPartyCaveat, 'signature'>): this;
  build(): Macaroon;
  buildL402Macaroon(params: L402BuildParams): L402Macaroon;
}

export interface L402BuildParams {
  paymentAmount: number;
  service: string;
  tier: number;
  capabilities: string[];
  maxUses?: number;
  expiresAt: string; // ISO 8601
}

// Utility Types
export type SerializedMacaroon = string; // Base64 encoded Macaroon
export type MacaroonSignature = string;   // Base64 encoded HMAC

// Error Types
export interface MacaroonError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}