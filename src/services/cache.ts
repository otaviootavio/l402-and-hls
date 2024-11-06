import type { ICache, CacheEntry, ProxyConfig } from "../types";

export class MemoryCache implements ICache {
  private cache: Map<string, CacheEntry>;
  private config: ProxyConfig;

  constructor(config: ProxyConfig) {
    this.cache = new Map();
    this.config = config;
  }

  get(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: CacheEntry): void {
    this.cache.set(key, value);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clean(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      const isManifest = key.endsWith(".m3u8");
      const maxAge = isManifest
        ? this.config.CACHE_DURATION.MANIFEST
        : this.config.CACHE_DURATION.SEGMENT;

      if (now - value.timestamp > maxAge * 1000) {
        this.delete(key);
      }
    }
  }
}
