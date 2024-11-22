import type { Request, Response, NextFunction } from "express";
import type { ILightningService } from "./interfaces";
import type { ITokenService } from "./interfaces";
import type { LNAPConfig, PaymentVerification, TokenMetadata } from "./types";
import { logger } from "./logger";

export class LNAPMiddleware {
  constructor(
    private readonly lightningService: ILightningService,
    private readonly tokenService: ITokenService,
    private readonly config: LNAPConfig
  ) {}

  initAuth = async (request: Request, response: Response): Promise<void> => {
    const reqId = crypto.randomUUID();

    logger.info(
      {
        reqId,
        method: "initAuth",
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        path: request.path,
      },
      "Starting auth initialization"
    );

    try {
      const invoice = await this.lightningService.generateInvoice(
        this.config.requiredPaymentAmount,
        this.config.invoiceExpiryMinutes
      );

      logger.info(
        {
          reqId,
          invoiceId: invoice.paymentHash,
          amount: invoice.amount,
          expiryMinutes: this.config.invoiceExpiryMinutes,
        },
        "Invoice generated successfully"
      );

      response.status(200).json(invoice);
    } catch (error) {
      logger.error(
        {
          reqId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Failed to generate invoice"
      );

      response.status(500).json({ error: "Failed to generate invoice" });
    }
  };

  verifyAuth = async (request: Request, response: Response): Promise<void> => {
    const reqId = crypto.randomUUID();

    logger.info(
      {
        reqId,
        method: "verifyAuth",
        ip: request.ip,
        path: request.path,
      },
      "Starting payment verification"
    );

    try {
      const body = request.body as PaymentVerification;

      if (!body?.paymentHash && !body?.paymentPreimage) {
        logger.warn(
          {
            reqId,
            body,
          },
          "Invalid verification data received"
        );

        response.status(400).json({ error: "Invalid verification data" });
        return;
      }

      const isValid = await this.lightningService.verifyPayment(body);

      logger.info(
        {
          reqId,
          paymentHash: body.paymentHash,
          isValid,
        },
        "Payment verification completed"
      );

      if (!isValid) {
        logger.warn(
          {
            reqId,
            paymentHash: body.paymentHash,
          },
          "Invalid payment verification"
        );

        response.status(400).json({ error: "Invalid payment verification" });
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const metadata: TokenMetadata = {
        amountPaid: this.config.requiredPaymentAmount,
        issuedAt: now,
        expiresAt: now + this.config.tokenExpiryMinutes * 60,
        paymentHash: body.paymentHash,
      };

      const token = this.tokenService.generateToken(metadata);

      logger.info(
        {
          reqId,
          paymentHash: body.paymentHash,
          tokenExpiryMinutes: this.config.tokenExpiryMinutes,
          issuedAt: new Date(metadata.issuedAt * 1000).toISOString(),
          expiresAt: new Date(metadata.expiresAt * 1000).toISOString(),
        },
        "Token generated successfully"
      );

      response.status(200).json({ token, metadata });
    } catch (error) {
      logger.error(
        {
          reqId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Failed to verify payment"
      );

      response.status(500).json({ error: "Failed to verify payment" });
    }
  };

  protect = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    const reqId = crypto.randomUUID();

    logger.info(
      {
        reqId,
        method: "protect",
        ip: request.ip,
        path: request.path,
      },
      "Verifying access token"
    );

    try {
      const authHeader = request.headers["authorization"];

      if (!authHeader?.startsWith("Bearer ")) {
        logger.warn(
          {
            reqId,
            authHeader,
          },
          "No token provided"
        );

        response.status(401).json({ error: "No token provided" });
        return;
      }

      const token = authHeader.split(" ")[1];
      const now = Math.floor(Date.now() / 1000);

      if (!this.tokenService.verifyToken(token)) {
        logger.warn(
          {
            reqId,
            token: token.substring(0, 10) + "...", // Log only part of the token
            currentTime: new Date(now * 1000).toISOString(),
          },
          "Token verification failed"
        );

        response.status(401).json({ error: "Token expired or invalid" });
        return;
      }

      logger.info(
        {
          reqId,
          path: request.path,
          method: request.method,
        },
        "Access granted"
      );

      next();
    } catch (error) {
      logger.error(
        {
          reqId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Token verification error"
      );

      response.status(401).json({ error: "Invalid token" });
    }
  };
}