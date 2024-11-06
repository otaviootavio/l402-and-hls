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

// Load environment variables
dotenv.config();

// Initialize L402
const l402 = new L402Middleware({
  secret: process.env.L402_SECRET || "your-default-secret-key",
  price: Number(process.env.L402_PRICE) || 1000,
  timeoutSeconds: Number(process.env.L402_TIMEOUT) || 3600,
});

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
