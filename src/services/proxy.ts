import axios, { AxiosError } from "axios";
import {
  type IProxyService,
  type ProxyResponse,
  type ICache,
  type IPlaylistRewriter,
  type IContentTypeResolver,
  type ProxyConfig,
} from "../types";

export class ProxyService implements IProxyService {
  constructor(
    private config: ProxyConfig,
    private cache: ICache,
    private playlistRewriter: IPlaylistRewriter,
    private contentTypeResolver: IContentTypeResolver
  ) {}

  async handleRequest(
    streamPath: string,
    protocol: string,
    host: string
  ): Promise<ProxyResponse> {
    const targetUrl = streamPath
      ? `${this.config.STREAM_BASE_URL}/${streamPath}`
      : `${this.config.STREAM_BASE_URL}/x36xhzz.m3u8`;

    const cacheKey = targetUrl;
    const cachedContent = this.cache.get(cacheKey);

    if (cachedContent) {
      return {
        data: cachedContent.data,
        contentType: this.contentTypeResolver.getContentType(streamPath),
        cacheHit: true,
      };
    }

    try {
      const response = await axios({
        method: "get",
        url: targetUrl,
        responseType: "arraybuffer",
        timeout: 5000,
        headers: {
          "User-Agent": "HLS-Proxy/1.0",
        },
      });

      let responseData: Buffer | string = response.data;

      if (streamPath.endsWith(".m3u8")) {
        const content = response.data.toString();
        const proxyBaseUrl = `${protocol}://${host}/hls`;
        responseData = this.playlistRewriter.rewrite(
          content,
          proxyBaseUrl,
          streamPath
        );
      }

      this.cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });

      return {
        data: responseData,
        contentType: this.contentTypeResolver.getContentType(streamPath),
        cacheHit: false,
      };
    } catch (error) {
      throw this.handleAxiosError(error as AxiosError);
    }
  }

  private handleAxiosError(error: AxiosError): Error {
    const errorResponse = {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
    };

    console.error("Proxy error:", errorResponse);

    const enhancedError = new Error(error.message);
    (enhancedError as any).status = error.response?.status || 500;
    (enhancedError as any).details = errorResponse;

    return enhancedError;
  }
}
