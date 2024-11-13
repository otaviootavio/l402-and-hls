export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
}
