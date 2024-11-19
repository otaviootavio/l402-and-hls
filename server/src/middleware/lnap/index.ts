// middleware/lnap/index.ts
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

  initAuth = async (request: Request<any>, response: Response): Promise<void> => {
    try {
      const invoice = await this.lightningService.generateInvoice(
        this.config.requiredPaymentAmount,
        this.config.invoiceExpiryMinutes
      );
      response.status(200).json(invoice);
    } catch (error) {
      response.status(500).json({ error: 'Failed to generate invoice' });
    }
  };

  verifyAuth = async (request: Request<any>, response: Response): Promise<void> => {
    try {
      const body = request.body as unknown as PaymentVerification;
      
      if (!body || !body.paymentHash || !body.paymentPreimage) {
        response.status(400).json({ error: 'Invalid verification data' });
        return;
      }

      const verification: PaymentVerification = {
        paymentHash: body.paymentHash,
        paymentPreimage: body.paymentPreimage
      };

      const isValid = await this.lightningService.verifyPayment(verification);

      if (!isValid) {
        response.status(400).json({ error: 'Invalid payment verification' });
        return;
      }

      const metadata: TokenMetadata = {
        amountPaid: this.config.requiredPaymentAmount,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + (this.config.tokenExpiryMinutes * 60),
        paymentHash: verification.paymentHash
      };

      const token = this.tokenService.generateToken(metadata);
      response.status(200).json({ token, metadata });
    } catch (error) {
      response.status(500).json({ error: 'Failed to verify payment' });
    }
  };

  protect = async (request: Request<any>, response: Response, next: NextFunction): Promise<void> => {
    const authHeader = request.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!this.tokenService.verifyToken(token)) {
      response.status(401).json({ error: 'Invalid token' });
      return;
    }

    next();
  };
}