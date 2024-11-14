import type { SignedMacaroonData } from "./token";

export interface MacaroonAuthContext {
  service: string;
  capability?: string;
  metadata?: Record<string, unknown>;
}

export interface MacaroonAuthorizerConfig {
  serviceName: string;
  defaultTier: number;
  capabilities: string[];
}

export interface MacaroonAuthorizer {
  authorize(params: {
    macaroonData: SignedMacaroonData;
    context: MacaroonAuthContext;
  }): Promise<boolean>;

  validateConstraints(params: {
    macaroonData: SignedMacaroonData;
    context: MacaroonAuthContext;
  }): Promise<boolean>;
}