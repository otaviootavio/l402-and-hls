import type { Request, Response } from "express";
import type { IProxyService, ProxyConfig } from "../types";

export class HLSController {
  constructor(
    private proxyService: IProxyService,
    private config: ProxyConfig
  ) {}

  handleHLSRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const streamPath = req.path.replace("/hls/", "");
      const response = await this.proxyService.handleRequest(
        streamPath,
        req.protocol,
        req.get("host") || ""
      );

      res.setHeader("Content-Type", response.contentType);
      res.setHeader("X-Cache", response.cacheHit ? "HIT" : "MISS");

      const maxAge = streamPath.endsWith(".m3u8")
        ? this.config.CACHE_DURATION.MANIFEST
        : this.config.CACHE_DURATION.SEGMENT;
      res.setHeader("Cache-Control", `public, max-age=${maxAge}`);

      res.send(response.data);
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.message,
        details: error.details,
      });
    }
  };

  handleHealthCheck = (_req: Request, res: Response): void => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  };
}
