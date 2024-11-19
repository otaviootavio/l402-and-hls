import type { Request, Response, NextFunction } from 'express';
import type { ILightningService } from './interfaces';
import type { ITokenService } from './interfaces';
import type { LNAPConfig, PaymentVerification, TokenMetadata } from './types';

export class LNAPMiddleware {
  constructor(
    private readonly lightningService: ILightningService,
    private readonly tokenService: ITokenService,
    private readonly config: LNAPConfig
  ) {}

  initAuth = async (request: Request, response: Response): Promise<void> => {
    try {
      const invoice = await this.lightningService.generateInvoice(
        this.config.requiredPaymentAmount,
        this.config.invoiceExpiryMinutes
      );
      response.status(200).json(invoice);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      response.status(500).json({ error: 'Failed to generate invoice' });
    }
  };

  verifyAuth = async (request: Request, response: Response): Promise<void> => {
    try {
      const body = request.body as PaymentVerification;
      
      if (!body?.paymentHash || !body?.paymentPreimage) {
        response.status(400).json({ error: 'Invalid verification data' });
        return;
      }

      const isValid = await this.lightningService.verifyPayment(body);

      if (!isValid) {
        response.status(400).json({ error: 'Invalid payment verification' });
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const metadata: TokenMetadata = {
        amountPaid: this.config.requiredPaymentAmount,
        issuedAt: now,
        expiresAt: now + (this.config.tokenExpiryMinutes * 60),
        paymentHash: body.paymentHash
      };

      const token = this.tokenService.generateToken(metadata);
      
      console.log('Generated token with metadata:', {
        ...metadata,
        tokenExpiryMinutes: this.config.tokenExpiryMinutes,
        currentTime: now,
        expiresIn: metadata.expiresAt - now
      });

      response.status(200).json({ token, metadata });
    } catch (error) {
      console.error('Failed to verify payment:', error);
      response.status(500).json({ error: 'Failed to verify payment' });
    }
  };

  protect = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = request.headers['authorization'];
      
      if (!authHeader?.startsWith('Bearer ')) {
        response.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.split(' ')[1];
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is valid
      if (!this.tokenService.verifyToken(token)) {
        console.log('Token verification failed:', {
          token,
          currentTime: now,
        });
        
        response.status(401).json({ error: 'Token expired or invalid' });
        return;
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      response.status(401).json({ error: 'Invalid token' });
    }
  };
}