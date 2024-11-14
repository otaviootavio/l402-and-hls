export interface L402Token {
  readonly macaroon: string;
  readonly preimage: string;
  readonly paymentHash: string;
  readonly expiry: number;
  readonly keyId: string;
  readonly version: number;
  readonly usageCount: number;
  readonly maxUses: number;
}

export interface MacaroonMetadata {
  readonly price: number;
  readonly description: string;
  readonly [key: string]: unknown;
}

export interface VersionedMacaroonData {
  readonly version: number;
  readonly keyId: string;
  readonly paymentHash: string;
  readonly timestamp: number;
  readonly expiryTime: number;
  readonly maxUses: number;
  readonly metadata?: MacaroonMetadata;
}

export interface SignedMacaroonData extends VersionedMacaroonData {
  readonly signature: string;
}