import type { L402Storage, L402StorageMetrics } from "./types/storage";
import type { L402Token } from "./types/token";

export class MemoryL402Storage implements L402Storage {
  private readonly tokenUsage: Map<string, number>;
  private readonly revokedTokens: Set<string>;
  private readonly tokens: Map<string, L402Token>;

  constructor() {
    this.tokenUsage = new Map();
    this.revokedTokens = new Set();
    this.tokens = new Map();
  }

  async getTokenUsage(paymentHash: string): Promise<number> {
    return this.tokenUsage.get(paymentHash) || 0;
  }

  async incrementTokenUsage(paymentHash: string): Promise<number> {
    const currentUsage = (this.tokenUsage.get(paymentHash) || 0) + 1;
    this.tokenUsage.set(paymentHash, currentUsage);
    return currentUsage;
  }

  async recordToken(token: L402Token): Promise<void> {
    this.tokens.set(token.paymentHash, token);
    this.tokenUsage.set(token.paymentHash, 0);
  }

  async isTokenRevoked(paymentHash: string): Promise<boolean> {
    return this.revokedTokens.has(paymentHash);
  }

  async revokeToken(paymentHash: string): Promise<void> {
    this.revokedTokens.add(paymentHash);
  }

  // Utility method for cleanup (can be called periodically)
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();

    for (const [paymentHash, token] of this.tokens) {
      if (token.expiry < now || now - token.expiry > maxAge) {
        this.tokens.delete(paymentHash);
        this.tokenUsage.delete(paymentHash);
        this.revokedTokens.delete(paymentHash);
      }
    }
  }

  // Method to get storage statistics
  async getStats(): Promise<{
    activeTokens: number;
    revokedTokens: number;
    totalUsage: number;
  }> {
    const totalUsage = Array.from(this.tokenUsage.values()).reduce(
      (sum, usage) => sum + usage,
      0
    );

    return {
      activeTokens: this.tokens.size,
      revokedTokens: this.revokedTokens.size,
      totalUsage,
    };
  }

  async getMetrics(): Promise<L402StorageMetrics> {
    return {
      activeTokens: this.tokens.size,
      revokedTokens: this.revokedTokens.size,
      totalPayments: this.tokenUsage.size,
    };
  }
}
