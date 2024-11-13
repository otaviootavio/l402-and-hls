import type { RetryConfig } from "./types/config";

export class RetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    timeoutMs: 5000,
  };

  static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig: RetryConfig = {
      ...this.DEFAULT_CONFIG,
      ...config,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Operation timeout")),
              finalConfig.timeoutMs
            )
          ),
        ]);
        return result as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < finalConfig.maxRetries - 1) {
          const delay = finalConfig.baseDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }
}
