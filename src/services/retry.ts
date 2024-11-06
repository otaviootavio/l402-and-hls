import type { RetryConfig } from "../types/config";

export class RetryService {
  async retry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const DEFAULT_RETRY_CONFIG: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      timeoutMs: 5000,
    };

    const retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Operation timeout')),
              retryConfig.timeoutMs
            )
          ),
        ]);
        return result as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryConfig.maxRetries - 1) {
          const delay = retryConfig.baseDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}