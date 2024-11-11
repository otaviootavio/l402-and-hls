export interface ProxyConfig {
  readonly STREAM_BASE_URL: string;
  readonly PORT: number;
  readonly CACHE_DURATION: {
    MANIFEST: number;
    SEGMENT: number;
  };
}

export interface CacheEntry {
  data: Buffer | string;
  timestamp: number;
}

export interface ICache {
  get(key: string): CacheEntry | undefined;
  set(key: string, value: CacheEntry): void;
  delete(key: string): void;
  clean(): void;
}

export interface IPlaylistRewriter {
  rewrite(content: string, proxyPath: string, currentPath: string): string;
}

export interface IContentTypeResolver {
  getContentType(filePath: string): string;
}

export interface IProxyService {
  handleRequest(
    streamPath: string,
    protocol: string,
    host: string
  ): Promise<ProxyResponse>;
}

export interface ProxyResponse {
  data: Buffer | string;
  contentType: string;
  cacheHit: boolean;
}
