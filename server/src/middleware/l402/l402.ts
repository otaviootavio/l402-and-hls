import type {
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express";
import crypto from "crypto";

import { CONSTANTS } from "../../config/contants";
import type { L402Logger } from "./types/logger";
import type { L402Config } from "./types/config";
import type { L402Token } from "./types/token";
import { L402Error } from "./L402Error";
import { ConsoleL402Logger } from "./console";
import { RetryService } from "./retry";
import type { MacaroonMinter } from "./types/macaroon-minter";
import type { MacaroonAuthorizer } from "./types/macaroon-authorizer";
import { DefaultMacaroonMinter } from "./macaroon-minter";
import { DefaultMacaroonAuthorizer } from "./macaroon-authorizer";

export interface Request extends ExpressRequest {
  l402Token?: L402Token;
}

export interface Invoice {
  id: string;
  request: string;
  is_confirmed: boolean;
}

export interface InvoiceService {
  createInvoice: (params: { tokens: number; description: string }) => Promise<Invoice>;
  getInvoice: (params: { id: string }) => Promise<Invoice>;
}


export class L402Middleware {
  private readonly logger: L402Logger;
  private readonly config: Required<L402Config>;
  private readonly macaroonMinter: MacaroonMinter
  private readonly macaroonAuthorizer: MacaroonAuthorizer
  private readonly invoiceService: InvoiceService;

  constructor(
    config: L402Config,
    invoiceService: InvoiceService,
    logger?: L402Logger
  ) {
    this.validateConfig(config);
    this.config = this.getDefaultConfig(config);
    this.logger = logger || new ConsoleL402Logger();
    this.invoiceService = invoiceService;

    this.macaroonMinter = new DefaultMacaroonMinter({
      secret: this.config.secret,
      keyId: this.config.keyId,
      defaultExpirySeconds: this.config.timeoutSeconds,
    });

    this.macaroonAuthorizer = new DefaultMacaroonAuthorizer({
      serviceName: this.config.serviceName,
      defaultTier: this.config.defaultTier,
      capabilities: this.config.capabilities
    });

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
    if (!config.serviceName) {
      throw new L402Error(
        "Service name is required",
        "INVALID_CONFIG",
        500
      );
    }
    if (typeof config.defaultTier !== "number") {
      throw new L402Error(
        "Default tier is required",
        "INVALID_CONFIG",
        500
      );
    }
    if (!Array.isArray(config.capabilities)) {
      throw new L402Error(
        "Capabilities must be an array",
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
      }
    };

    return {
      ...defaults,
      ...config,
      retryConfig: {
        ...defaults.retryConfig,
        ...config.retryConfig,
      },
      description: config.description || defaults.description,
      keyId: config.keyId || defaults.keyId,
      keyRotationIntervalHours:
        config.keyRotationIntervalHours || defaults.keyRotationIntervalHours,
      maxTokenUses: config.maxTokenUses || defaults.maxTokenUses,
    };
  }

  private async verifyLightningPayment(paymentHash: string): Promise<boolean> {
    try {
      const invoice = await RetryService.retryOperation(
        () => this.invoiceService.getInvoice({ id: paymentHash }),
        this.config.retryConfig
      );

      return invoice.is_confirmed;
    } catch (error) {
      this.logger.error("PAYMENT_VERIFICATION_FAILED", "Failed to verify payment", {
        error,
        paymentHash,
      });
      throw new L402Error(
        "Failed to verify payment",
        "PAYMENT_VERIFICATION_FAILED",
        400,
        error
      );
    }
  }


  private async createChallenge(): Promise<{
    macaroon: string;
    invoice: string;
    paymentHash: string;
  }> {
    try {
      // Criar invoice com retry
      const createdInvoice = await RetryService.retryOperation(
        () =>
          this.invoiceService.createInvoice({
            tokens: this.config.priceSats,
            description: this.config.description,
          }),
        this.config.retryConfig
      );

      // Criar macaroon usando o novo minter
      const { macaroon } = this.macaroonMinter.mint({
        paymentHash: createdInvoice.id,
        expiryTime: Date.now() + this.config.timeoutSeconds * 1000,
        metadata: {
          price: this.config.priceSats,
          description: this.config.description,
          // Adicionar dados necessários para autorização
          services: `${this.config.serviceName}:${this.config.defaultTier}`,
          [`${this.config.serviceName}_capabilities`]: this.config.capabilities.join(",")
        }
      });

      return {
        macaroon,
        invoice: createdInvoice.request,
        paymentHash: createdInvoice.id,
      };
    } catch (error) {
      this.logger.error("CHALLENGE_CREATION_FAILED", "Failed to create challenge", {
        error,
      });
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

      // Verificar se precisa criar um novo challenge
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

      // Extrair macaroon e preimage
      const tokenPart = authHeader.slice(CONSTANTS.AUTH_SCHEME.length + 1);
      const [macaroon, preimage] = tokenPart.split(CONSTANTS.TOKEN_SEPARATOR);

      if (!macaroon || !preimage) {
        throw new L402Error(
          "Missing macaroon or preimage",
          "INVALID_TOKEN",
          401
        );
      }

      // Verificar macaroon usando o minter
      const { isValid, data: macaroonData } = this.macaroonMinter.verify({
        macaroon,
        preimage
      });

      if (!isValid || !macaroonData) {
        throw new L402Error(
          "Invalid macaroon",
          "INVALID_TOKEN",
          401
        );
      }

      // Verificar autorização usando o authorizer
      const isAuthorized = await this.macaroonAuthorizer.authorize({
        macaroonData,
        context: {
          service: this.config.serviceName,
          metadata: req.body
        }
      });

      if (!isAuthorized) {
        throw new L402Error(
          "Unauthorized",
          "UNAUTHORIZED",
          401
        );
      }

      const token: L402Token = {
        macaroon,
        preimage,
        paymentHash: macaroonData.paymentHash,
        expiry: macaroonData.expiryTime,
        keyId: macaroonData.keyId,
        version: macaroonData.version,
        usageCount: 0,
      };

      const isPaid = await this.verifyLightningPayment(macaroonData.paymentHash);
      if (!isPaid) {
        throw new L402Error(
          "Payment not confirmed",
          "PAYMENT_NOT_CONFIRMED",
          401
        );
      }

      req.l402Token = token; 

      this.logger.info("AUTH_SUCCESS", "Authentication successful", {
        paymentHash: macaroonData.paymentHash,
        keyId: macaroonData.keyId,
        timeUntilExpire: macaroonData.expiryTime,
      });

      next();

    } catch (error) {
      this.handleError(error, res);
    }
  };
}
