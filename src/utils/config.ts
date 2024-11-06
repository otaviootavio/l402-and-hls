import crypto from 'crypto';
import type { L402Config, RateLimitConfig, RetryConfig } from '../types/config';

export class ConfigUtils {
  static getDefaultConfig(config: L402Config): Required<L402Config> {
    // Define default values
    const defaults = {
      description: 'L402 API Access Token',
      keyId: crypto.randomBytes(16).toString('hex'),
      keyRotationIntervalHours: 24,
      maxTokenUses: 1000,
      retryConfig: {
        maxRetries: 3,
        baseDelayMs: 1000,
        timeoutMs: 5000,
      } as RetryConfig,
      rateLimitConfig: {
        windowMs: 60000,
        maxRequests: 100,
      } as RateLimitConfig,
    };

    // Merge with provided config
    return {
      ...defaults,
      ...config,
      retryConfig: {
        ...defaults.retryConfig,
        ...config.retryConfig,
      },
      rateLimitConfig: {
        ...defaults.rateLimitConfig,
        ...config.rateLimitConfig,
      },
      description: config.description || defaults.description,
      keyId: config.keyId || defaults.keyId,
      keyRotationIntervalHours: 
        config.keyRotationIntervalHours || defaults.keyRotationIntervalHours,
      maxTokenUses: config.maxTokenUses || defaults.maxTokenUses,
    };
  }
}
