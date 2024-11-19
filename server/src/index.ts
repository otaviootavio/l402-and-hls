import express, { type Request, type Response } from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { proxyConfig } from "./config/proxy-config";

import { MemoryCache } from "./services/cache";
import { PlaylistRewriter } from "./services/playlist-rewriter";
import { ContentTypeResolver } from "./services/content-type-resolver";
import { ProxyService } from "./services/proxy";
import { HLSController } from "./controllers/hls-controller";

import { createRateLimiter } from "./middleware/rate-limiter";

import { authenticatedLndGrpc, type AuthenticatedLnd } from "lightning";
import type { ILightningService } from "./middleware/lnap/interfaces";
import { LightningService } from "./middleware/lnap/LightningService";
import type { LNAPConfig } from "./middleware/lnap/types";
import { TokenService } from "./middleware/lnap/TokenService";
import { LNAPMiddleware } from "./middleware/lnap";

// Load environment variables
dotenv.config();

async function main() {
  // Initialize LND and L402
  const { lnd } = await authenticatedLndGrpc({
    socket: process.env.LND_SOCKET,
    macaroon: process.env.LND_MACAROON,
    cert: process.env.LND_CERT,
  });

  // Configuration
  const config: LNAPConfig = {
    invoiceExpiryMinutes: 10,
    tokenExpiryMinutes: 60,
    requiredPaymentAmount: 1000,
    hmacSecret: process.env.HMAC_SECRET || "your-secret-key",
  };

  const tokenService = new TokenService(config.hmacSecret);

  // Initialize LNAP middleware
  const lightningService = new LightningService(lnd);

  const lnap = new LNAPMiddleware(lightningService, tokenService, config);

  // Initialize dependencies
  const cache = new MemoryCache(proxyConfig);
  const playlistRewriter = new PlaylistRewriter();
  const contentTypeResolver = new ContentTypeResolver();
  const proxyService = new ProxyService(
    proxyConfig,
    cache,
    playlistRewriter,
    contentTypeResolver
  );
  const hlsController = new HLSController(proxyService, proxyConfig);

  // Setup cache cleaning interval
  setInterval(() => cache.clean(), 60000);

  // Initialize Express app
  const app = express();

  // Middleware
  app.use(
    cors({
      exposedHeaders: ["WWW-Authenticate"],
      credentials: true,
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "WWW-Authenticate"],
    })
  );
  app.use(compression());
  app.use(express.json());
  app.use(createRateLimiter());

  // Routes
  app.get("/auth/init", (req, res) => lnap.initAuth(req, res));
  app.post("/auth/verify", (req, res) => lnap.verifyAuth(req, res));
  app.get(
    "/api/protected",
    (req, res, next) => lnap.protect(req, res, next),
    (req, res) => {
      res.json({ message: "Access granted to protected resource" });
    }
  );

  app.get("/hls/*", hlsController.handleHLSRequest);
  app.get("/health", hlsController.handleHealthCheck);

  // Start server
  app.listen(proxyConfig.PORT, () => {
    console.log(`HLS proxy server running on port ${proxyConfig.PORT}`);
    console.log(
      `Access the proxy at http://localhost:${proxyConfig.PORT}/hls/`
    );
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
