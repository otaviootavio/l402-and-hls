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
  
  export interface VersionedMacaroonData {
    readonly version: number;
    readonly keyId: string;
    readonly paymentHash: string;
    readonly timestamp: number;
    readonly expiryTime: number;
    readonly maxUses: number;
    readonly metadata?: {
      price: number;
      description: string;
    };
  }
  
  export interface SignedMacaroonData extends VersionedMacaroonData {
    readonly signature: string;
  }
  