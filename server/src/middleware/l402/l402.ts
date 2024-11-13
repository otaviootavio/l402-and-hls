import type {
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express";
import crypto from "crypto";
import { createInvoice, getInvoice, type AuthenticatedLnd } from "lightning";

import { CONSTANTS } from "../../config/contants";
import { MemoryL402Storage } from "./memory";
import type { L402Storage } from "./types/storage";
import type { L402Logger } from "./logger";
import type { L402Config } from "./types/config";
import type { L402Token } from "./types/token";
import { L402Error } from "./L402Error";
import { ConsoleL402Logger } from "./console";
import { MacaroonService } from "./macaroons";
import { RetryService } from "./retry";

interface Request extends ExpressRequest {
  l402Token?: L402Token;
}

export class L402Middleware {
  private readonly storage: L402Storage;
  private readonly logger: L402Logger;
  private readonly config: Required<L402Config>;
  private readonly macaroonService: MacaroonService;

  constructor(
    config: L402Config,
    private readonly lnd: AuthenticatedLnd,
    storage?: L402Storage,
    logger?: L402Logger
  ) {
    this.validateConfig(config);
    this.config = this.getDefaultConfig(config);
    this.storage = storage || new MemoryL402Storage();
    this.logger = logger || new ConsoleL402Logger();
    this.macaroonService = new MacaroonService(this.config.secret);
  }

  private validateConfig(config: L402Config): void {
    if (!config.secret || typeof config.secret !== "string") {
      throw new L402Error("Invalid secret key", "INVALID_CONFIG", 500);
    }
    if (
      !Number.isInteger(config.priceSats) ||
      config.priceSats < CONSTANTS.MIN_PRICE_SATS
    ) {
      throw new L402Error(
        `Price must be >= ${CONSTANTS.MIN_PRICE_SATS}`,
        "INVALID_CONFIG",
        500
      );
    }
    if (
      !Number.isInteger(config.timeoutSeconds) ||
      config.timeoutSeconds <= 0
    ) {
      throw new L402Error(
        "Invalid timeout configuration",
        "INVALID_CONFIG",
        500
      );
    }
  }

  private getDefaultConfig(config: L402Config): Required<L402Config> {
    const defaults = {
      description: "L402 API Access Token",
      keyId: crypto.randomBytes(16).toString("hex"),
      keyRotationIntervalHours: 24,
      maxTokenUses: 1000,
      retryConfig: {
        maxRetries: 3,
        baseDelayMs: 1000,
        timeoutMs: 5000,
      },
      rateLimitConfig: {
        windowMs: 60000,
        maxRequests: 100,
      },
    };

    return {
      ...defaults,
      ...config,
      retryConfig: {
        ...defaults.retryConfig,
        ...config.retryConfig,
      },
      rateLimitConfig: {
        ...defaults.rateLimitConfig,
        ...config.rateLimitConfig,
      },
      description: config.description || defaults.description,
      keyId: config.keyId || defaults.keyId,
      keyRotationIntervalHours:
        config.keyRotationIntervalHours || defaults.keyRotationIntervalHours,
      maxTokenUses: config.maxTokenUses || defaults.maxTokenUses,
    };
  }

  private validatePreimage(preimage: string, paymentHash: string): void {
    if (!preimage?.match(/^[a-f0-9]{64}$/i)) {
      throw new L402Error("Invalid preimage format", "INVALID_PREIMAGE", 401);
    }

    const calculatedHash = crypto
      .createHash(CONSTANTS.HASH_ALGORITHM)
      .update(Buffer.from(preimage, "hex"))
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(calculatedHash),
        Buffer.from(paymentHash)
      )
    ) {
      throw new L402Error("Invalid preimage", "INVALID_PREIMAGE", 401);
    }
  }

  private async verifyLightningPayment(paymentHash: string): Promise<boolean> {
    try {
      const invoice = await RetryService.retryOperation(
        () =>
          getInvoice({
            lnd: this.lnd,
            id: paymentHash,
          }),
        this.config.retryConfig
      );

      return invoice.is_confirmed;
    } catch (error) {
      this.logger.error(
        "PAYMENT_VERIFICATION_FAILED",
        "Failed to verify payment",
        {
          error,
          paymentHash,
        }
      );
      throw new L402Error(
        "Failed to verify payment",
        "PAYMENT_VERIFICATION_FAILED",
        400,
        error
      );
    }
  }

  private async validateTokenUsage(token: L402Token): Promise<void> {
    if (await this.storage.isTokenRevoked(token.paymentHash)) {
      throw new L402Error("Token has been revoked", "TOKEN_REVOKED", 401);
    }

    const usageCount = await this.storage.incrementTokenUsage(
      token.paymentHash
    );
    if (usageCount > token.maxUses) {
      await this.storage.revokeToken(token.paymentHash);
      throw new L402Error("Token usage limit exceeded", "TOKEN_EXPIRED", 401);
    }
  }

  private async createChallenge(): Promise<{
    macaroon: string;
    invoice: string;
    paymentHash: string;
  }> {
    try {
      const createdInvoice = await RetryService.retryOperation(
        () =>
          createInvoice({
            lnd: this.lnd,
            tokens: this.config.priceSats,
            description: this.config.description,
          }),
        this.config.retryConfig
      );

      const paymentHash = createdInvoice.id;
      const expiryTime = Date.now() + this.config.timeoutSeconds * 1000;
      const macaroon = this.macaroonService.create(
        paymentHash,
        expiryTime,
        this.config.keyId,
        this.config.maxTokenUses,
        {
          price: this.config.priceSats,
          description: this.config.description,
        }
      );

      return {
        macaroon,
        invoice: createdInvoice.request,
        paymentHash,
      };
    } catch (error) {
      this.logger.error(
        "CHALLENGE_CREATION_FAILED",
        "Failed to create challenge",
        {
          error,
        }
      );
      throw new L402Error(
        "Failed to create challenge",
        "CHALLENGE_CREATION_FAILED",
        500,
        error
      );
    }
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof L402Error) {
      this.logger.error(error.code, error.message, {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      });

      res.status(error.statusCode).json({
        message: error.message,
        code: error.code,
        ...(process.env.NODE_ENV === "development" && {
          details: error.details,
        }),
      });
      return;
    }

    const unexpectedError = new L402Error(
      "An unexpected error occurred",
      "INTERNAL_ERROR",
      500,
      error,
      false
    );

    this.logger.error("INTERNAL_ERROR", "Unexpected error occurred", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      message: unexpectedError.message,
      code: unexpectedError.code,
    });
  }

  public authorize = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith(CONSTANTS.AUTH_SCHEME)) {
        const challenge = await this.createChallenge();
        res.setHeader(
          "WWW-Authenticate",
          `${CONSTANTS.AUTH_SCHEME} macaroon="${challenge.macaroon}", invoice="${challenge.invoice}"`
        );
        res.status(402).json({
          message: "Payment Required",
          paymentHash: challenge.paymentHash,
          price: this.config.priceSats,
          description: this.config.description,
        });
        return;
      }

      const tokenPart = authHeader.slice(CONSTANTS.AUTH_SCHEME.length + 1);
      const [macaroon, preimage] = tokenPart.split(CONSTANTS.TOKEN_SEPARATOR);

      if (!macaroon || !preimage) {
        throw new L402Error(
          "Missing macaroon or preimage",
          "INVALID_TOKEN",
          401
        );
      }

      const macaroonData = this.macaroonService.verify(macaroon);
      this.validatePreimage(preimage, macaroonData.paymentHash);

      const token: L402Token = {
        macaroon,
        preimage,
        paymentHash: macaroonData.paymentHash,
        expiry: macaroonData.expiryTime,
        keyId: macaroonData.keyId,
        version: macaroonData.version,
        usageCount: 0,
        maxUses: macaroonData.maxUses,
      };

      const isPaid = await this.verifyLightningPayment(token.paymentHash);
      if (!isPaid) {
        throw new L402Error(
          "Payment not confirmed",
          "PAYMENT_NOT_CONFIRMED",
          401
        );
      }

      await this.validateTokenUsage(token);
      req.l402Token = token;

      this.logger.info("AUTH_SUCCESS", "Authentication successful", {
        paymentHash: token.paymentHash,
        keyId: token.keyId,
        timeUntilExpire: token.expiry,
      });

      next();
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public async revokeToken(paymentHash: string): Promise<void> {
    try {
      await this.storage.revokeToken(paymentHash);
      this.logger.info("TOKEN_REVOKED", "Token revoked successfully", {
        paymentHash,
      });
    } catch (error) {
      this.logger.error("REVOCATION_FAILED", "Failed to revoke token", {
        error,
        paymentHash,
      });
      throw new L402Error(
        "Failed to revoke token",
        "REVOCATION_FAILED",
        500,
        error
      );
    }
  }

  public async getTokenInfo(paymentHash: string): Promise<{
    usageCount: number;
    isRevoked: boolean;
  }> {
    try {
      const [usageCount, isRevoked] = await Promise.all([
        this.storage.getTokenUsage(paymentHash),
        this.storage.isTokenRevoked(paymentHash),
      ]);

      return { usageCount, isRevoked };
    } catch (error) {
      this.logger.error("TOKEN_INFO_FAILED", "Failed to get token info", {
        error,
        paymentHash,
      });
      throw new L402Error(
        "Failed to get token info",
        "TOKEN_INFO_FAILED",
        500,
        error
      );
    }
  }

  public async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    lndConnected: boolean;
  }> {
    try {
      await RetryService.retryOperation(
        () =>
          getInvoice({
            lnd: this.lnd,
            id: "dummy-id",
          }),
        {
          ...this.config.retryConfig,
          maxRetries: 1,
        }
      ).catch(() => {
        // Ignore error, we just want to test connection
      });

      return {
        status: "healthy",
        lndConnected: true,
      };
    } catch (error) {
      this.logger.warn("HEALTH_CHECK_FAILED", "Health check failed", { error });
      return {
        status: "unhealthy",
        lndConnected: false,
      };
    }
  }
}
