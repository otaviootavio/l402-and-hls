import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { config } from "./config/config";
import { MemoryCache } from "./services/cache";
import { PlaylistRewriter } from "./services/playlist-rewriter";
import { ContentTypeResolver } from "./services/content-type-resolver";
import { ProxyService } from "./services/proxy";
import { HLSController } from "./controllers/hls-controller";
import { createRateLimiter } from "./middleware/rate-limiter";
import { L402Middleware } from "./middleware/l402";
import { authenticatedLndGrpc } from "lightning";

// Load environment variables
dotenv.config();

// Initialize LND client
const initializeLnd = async () => {
  try {
    const { lnd } = await authenticatedLndGrpc({
      socket: process.env.LND_SOCKET || "127.0.0.1:10009",
      macaroon: process.env.LND_MACAROON,
      cert: process.env.LND_CERT,
    });
    return lnd;
  } catch (error) {
    console.error("Failed to initialize LND:", error);
    throw error;
  }
};

async function main() {
  // Initialize LND and L402
  const lnd = await initializeLnd();

  // Create L402 middleware
  const l402 = new L402Middleware(
    {
      secret: process.env.L402_SECRET ?? "",
      priceSats: Number(process.env.L402_PRICE_SATS) || 1000,
      timeoutSeconds: Number(process.env.L402_TIMEOUT_SECONDS) || 3600,
      description: "API Access Token",
    },
    lnd
  );

  // Initialize dependencies
  const cache = new MemoryCache(config);
  const playlistRewriter = new PlaylistRewriter();
  const contentTypeResolver = new ContentTypeResolver();
  const proxyService = new ProxyService(
    config,
    cache,
    playlistRewriter,
    contentTypeResolver
  );
  const hlsController = new HLSController(proxyService, config);

  // Setup cache cleaning interval
  setInterval(() => cache.clean(), 60000);

  // Initialize Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(createRateLimiter());

  // Routes
  app.get("/test/pay", l402.authorize, hlsController.handleHealthCheck);
  app.get("/hls/*", l402.authorize, hlsController.handleHLSRequest);
  app.get("/health", hlsController.handleHealthCheck);

  // Start server
  app.listen(config.PORT, () => {
    console.log(`HLS proxy server running on port ${config.PORT}`);
    console.log(`Access the proxy at http://localhost:${config.PORT}/hls/`);
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
