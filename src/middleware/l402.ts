import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createInvoice, getInvoice, type AuthenticatedLnd } from 'lightning';

import { CONSTANTS } from '../constants';
import { MemoryL402Storage } from '../storage/memory';
import { ConsoleL402Logger } from '../logger/console';
import type { L402Storage, L402StorageMetrics } from '../types/storage';
import type { L402Logger } from '../types/logger';
import type { L402Config, RetryConfig } from '../types/config';
import type { L402Token, SignedMacaroonData, VersionedMacaroonData } from '../types/token';
import { L402Error } from '../errors/L402Error';

interface Request extends ExpressRequest {
  l402Token?: L402Token;
}

interface SanitizedHeaders {
  authorization?: string;
  'content-type'?: string;
}

export class L402Middleware {
  private readonly storage: L402Storage;
  private readonly logger: L402Logger;
  private readonly config: Required<L402Config>;

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
  }

  private validateConfig(config: L402Config): void {
    if (!config.secret || typeof config.secret !== 'string') {
      throw new L402Error('Invalid secret key', 'INVALID_CONFIG', 500);
    }
    if (!Number.isInteger(config.priceSats) || config.priceSats < CONSTANTS.MIN_PRICE_SATS) {
      throw new L402Error(
        `Price must be >= ${CONSTANTS.MIN_PRICE_SATS}`,
        'INVALID_CONFIG',
        500
      );
    }

    if (
      !Number.isInteger(config.timeoutSeconds) ||
      config.timeoutSeconds <= 0
    ) {
      throw new L402Error(
        'Invalid timeout configuration',
        'INVALID_CONFIG',
        500
      );
    }
  }

  private getDefaultConfig(config: L402Config): Required<L402Config> {
    const defaults = {
      description: 'L402 API Access Token',
      keyId: crypto.randomBytes(16).toString('hex'),
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
      }
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
      keyRotationIntervalHours: config.keyRotationIntervalHours || defaults.keyRotationIntervalHours,
      maxTokenUses: config.maxTokenUses || defaults.maxTokenUses,
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const DEFAULT_RETRY_CONFIG: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      timeoutMs: 5000,
    };

    const retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Operation timeout')),
              retryConfig.timeoutMs
            )
          ),
        ]);
        return result as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryConfig.maxRetries - 1) {
          const delay = retryConfig.baseDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private createMacaroon(paymentHash: string, expiryTime: number): string {
    const macaroonData: VersionedMacaroonData = {
      version: CONSTANTS.DEFAULT_VERSION,
      keyId: this.config.keyId,
      paymentHash,
      timestamp: Date.now(),
      expiryTime,
      maxUses: this.config.maxTokenUses,
      metadata: {
        price: this.config.priceSats,
        description: this.config.description,
      },
    };

    const signature = this.signMacaroon(macaroonData);
    const signedData: SignedMacaroonData = { ...macaroonData, signature };

    return Buffer.from(JSON.stringify(signedData)).toString('base64');
  }

  private signMacaroon(data: VersionedMacaroonData): string {
    const dataToSign = JSON.stringify(data);
    const hmac = crypto.createHmac(CONSTANTS.HASH_ALGORITHM, this.config.secret);
    hmac.update(dataToSign);
    return hmac.digest('hex');
  }

  private verifyMacaroon(macaroon: string): SignedMacaroonData {
    try {
      const decodedMacaroon: SignedMacaroonData = JSON.parse(
        Buffer.from(macaroon, 'base64').toString()
      );

      const { signature, ...data } = decodedMacaroon;
      const expectedSignature = this.signMacaroon(data);

      if (
        !crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        )
      ) {
        throw new L402Error('Invalid signature', 'INVALID_SIGNATURE', 401);
      }

      if (decodedMacaroon.expiryTime < Date.now()) {
        throw new L402Error('Macaroon expired', 'MACAROON_EXPIRED', 401);
      }

      return decodedMacaroon;
    } catch (error) {
      if (error instanceof L402Error) throw error;
      throw new L402Error('Invalid macaroon format', 'INVALID_FORMAT', 401, error);
    }
  }

  private validatePreimage(preimage: string, paymentHash: string): void {
    if (!preimage?.match(/^[a-f0-9]{64}$/i)) {
      throw new L402Error('Invalid preimage format', 'INVALID_PREIMAGE', 401);
    }

    const calculatedHash = crypto
      .createHash(CONSTANTS.HASH_ALGORITHM)
      .update(Buffer.from(preimage, 'hex'))
      .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(calculatedHash),
        Buffer.from(paymentHash)
      )
    ) {
      throw new L402Error('Invalid preimage', 'INVALID_PREIMAGE', 401);
    }
  }

  private async verifyLightningPayment(paymentHash: string): Promise<boolean> {
    try {
      const invoice = await this.retryOperation(
        () => getInvoice({
          lnd: this.lnd,
          id: paymentHash,
        }),
        this.config.retryConfig
      );

      return invoice.is_confirmed;
    } catch (error) {
      this.logger.error('PAYMENT_VERIFICATION_FAILED', 'Failed to verify payment', {
        error,
        paymentHash,
      });
      throw new L402Error(
        'Failed to verify payment',
        'PAYMENT_VERIFICATION_FAILED',
        400,
        error
      );
    }
  }

  private async validateTokenUsage(token: L402Token): Promise<void> {
    if (await this.storage.isTokenRevoked(token.paymentHash)) {
      throw new L402Error('Token has been revoked', 'TOKEN_REVOKED', 401);
    }

    const usageCount = await this.storage.incrementTokenUsage(token.paymentHash);
    if (usageCount > token.maxUses) {
      await this.storage.revokeToken(token.paymentHash);
      throw new L402Error('Token usage limit exceeded', 'TOKEN_EXPIRED', 401);
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): SanitizedHeaders {
    const sanitized: SanitizedHeaders = {};

    if (headers.authorization) {
      sanitized.authorization = String(headers.authorization).slice(0, 1000);
    }

    if (headers['content-type']) {
      sanitized['content-type'] = String(headers['content-type']).slice(0, 1000);
    }

    return sanitized;
  }

  private async createChallenge(): Promise<{
    macaroon: string;
    invoice: string;
    paymentHash: string;
  }> {
    try {
      const createdInvoice = await this.retryOperation(
        () => createInvoice({
          lnd: this.lnd,
          tokens: this.config.priceSats,
          description: this.config.description,
        }),
        this.config.retryConfig
      );

      const paymentHash = createdInvoice.id;
      const expiryTime = Date.now() + this.config.timeoutSeconds * 1000;
      const macaroon = this.createMacaroon(paymentHash, expiryTime);

      return {
        macaroon,
        invoice: createdInvoice.request,
        paymentHash,
      };
    } catch (error) {
      this.logger.error('CHALLENGE_CREATION_FAILED', 'Failed to create challenge', {
        error,
      });
      throw new L402Error(
        'Failed to create challenge',
        'CHALLENGE_CREATION_FAILED',
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
        ...(process.env.NODE_ENV === 'development' && { details: error.details }),
      });
      return;
    }

    const unexpectedError = new L402Error(
      'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      error,
      false
    );

    this.logger.error('INTERNAL_ERROR', 'Unexpected error occurred', {
      error: error instanceof Error ? error.message : 'Unknown error',
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
      const sanitizedHeaders = this.sanitizeHeaders(req.headers as Record<string, string>);
      const authHeader = sanitizedHeaders.authorization;

      if (!authHeader?.startsWith(CONSTANTS.AUTH_SCHEME)) {
        const challenge = await this.createChallenge();
        res.setHeader(
          'WWW-Authenticate',
          `${CONSTANTS.AUTH_SCHEME} macaroon="${challenge.macaroon}", invoice="${challenge.invoice}"`
        );
        res.status(402).json({
          message: 'Payment Required',
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
          'Missing macaroon or preimage',
          'INVALID_TOKEN',
          401
        );
      }

      const macaroonData = this.verifyMacaroon(macaroon);
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
          'Payment not confirmed',
          'PAYMENT_NOT_CONFIRMED',
          401
        );
      }

      await this.validateTokenUsage(token);
      req.l402Token = token;

      this.logger.info('AUTH_SUCCESS', 'Authentication successful', {
        paymentHash: token.paymentHash,
        keyId: token.keyId,
      });

      next();
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public async revokeToken(paymentHash: string): Promise<void> {
    try {
      await this.storage.revokeToken(paymentHash);
      this.logger.info('TOKEN_REVOKED', 'Token revoked successfully', {
        paymentHash,
      });
    } catch (error) {
      this.logger.error('REVOCATION_FAILED', 'Failed to revoke token', {
        error,
        paymentHash,
      });
      throw new L402Error(
        'Failed to revoke token',
        'REVOCATION_FAILED',
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
      this.logger.error('TOKEN_INFO_FAILED', 'Failed to get token info', {
        error,
        paymentHash,
      });
      throw new L402Error(
        'Failed to get token info',
        'TOKEN_INFO_FAILED',
        500,
        error
      );
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    lndConnected: boolean;
  }> {
    try {
      await this.retryOperation(
        () =>
          getInvoice({
            lnd: this.lnd,
            id: 'dummy-id',
          }),
        {
          ...this.config.retryConfig,
          maxRetries: 1,
        }
      ).catch(() => {
        // Ignore error, we just want to test connection
      });

      return {
        status: 'healthy',
        lndConnected: true,
      };
    } catch (error) {
      this.logger.warn('HEALTH_CHECK_FAILED', 'Health check failed', { error });
      return {
        status: 'unhealthy',
        lndConnected: false,
      };
    }
  }

  public async getMetrics(): Promise<L402StorageMetrics> {
    try {
      if ('getMetrics' in this.storage) {
        return await this.storage.getMetrics!();
      }

      // Default metrics if storage doesn't support metrics
      return {
        activeTokens: 0,
        revokedTokens: 0,
        totalPayments: 0,
      };
    } catch (error) {
      this.logger.error('METRICS_FAILED', 'Failed to get metrics', { error });
      throw new L402Error(
        'Failed to get metrics',
        'METRICS_FAILED',
        500,
        error
      );
    }
  }

}