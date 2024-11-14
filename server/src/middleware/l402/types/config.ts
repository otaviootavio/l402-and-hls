// types/config.ts
export interface L402Config {
  secret: string;
  priceSats: number;
  timeoutSeconds: number;
  description?: string;
  keyId?: string;
  keyRotationIntervalHours?: number;
  maxTokenUses?: number;
  retryConfig?: {
    maxRetries: number;
    baseDelayMs: number;
    timeoutMs: number;
  };
  rateLimitConfig?: {
    windowMs: number;
    maxRequests: number;
  };
  serviceName: string;
  defaultTier: number;
  capabilities: string[];
}
export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly timeoutMs: number;
}

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
}
