export interface RetryConfig {
    readonly maxRetries: number;
    readonly baseDelayMs: number;
    readonly timeoutMs: number;
  }
  
  export interface RateLimitConfig {
    readonly windowMs: number;
    readonly maxRequests: number;
  }
  
  export interface L402Config {
    readonly secret: string;
    readonly priceSats: number;
    readonly timeoutSeconds: number;
    readonly description?: string;
    readonly keyId?: string;
    readonly keyRotationIntervalHours?: number;
    readonly maxTokenUses?: number;
    readonly retryConfig?: Partial<RetryConfig>;
    readonly rateLimitConfig?: Partial<RateLimitConfig>;
  }
  