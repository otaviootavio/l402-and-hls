import crypto from 'crypto';
import type { 
  MacaroonAuthorizer,
  MacaroonAuthorizerConfig,
  MacaroonAuthContext,
  L402Macaroon,
  MacaroonCaveat,
} from './types/token';
import { L402Error } from './L402Error';
import { CONSTANTS } from '../../config/contants';

export class DefaultMacaroonAuthorizer implements MacaroonAuthorizer {
  constructor(
    private readonly config: MacaroonAuthorizerConfig,
    private readonly secret: string
  ) {}

  public async authorize({
    macaroon,
    context
  }: {
    macaroon: L402Macaroon;
    context: MacaroonAuthContext;
  }): Promise<boolean> {
    try {
      // 1. Verify macaroon signature chain
      const isValidSignature = this.verifySignatureChain(macaroon);
      if (!isValidSignature) {
        throw new L402Error('Invalid signature', 'INVALID_SIGNATURE', 401);
      }

      // 2. Verify service location
      if (macaroon.location !== this.config.serviceName) {
        throw new L402Error('Invalid service', 'INVALID_SERVICE', 401);
      }

      // 3. Verify each caveat
      for (const caveat of macaroon.caveats) {
        const isValid = await this.verifyCaveat(caveat, context);
        if (!isValid) {
          throw new L402Error(
            `Failed to verify caveat: ${JSON.stringify(caveat.condition)}`,
            'INVALID_CAVEAT',
            401
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof L402Error) {
        throw error;
      }
      throw new L402Error('Authorization failed', 'AUTH_FAILED', 401, error);
    }
  }

  private verifySignatureChain(macaroon: L402Macaroon): boolean {
    try {
      // Start with root key (secret)
      let currentSignature = crypto
        .createHmac(CONSTANTS.HASH_ALGORITHM, this.secret)
        .update(macaroon.identifier)
        .digest();

      // Verify each caveat's signature
      for (const caveat of macaroon.caveats) {
        // Verify this caveat's signature
        const expectedSignature = crypto
          .createHmac(CONSTANTS.HASH_ALGORITHM, currentSignature)
          .update(JSON.stringify(caveat.condition))
          .digest('base64url');

        if (caveat.signature !== expectedSignature) {
          return false;
        }

        // Update current signature for next caveat
        currentSignature = Buffer.from(caveat.signature, 'base64url');
      }

      // Verify final macaroon signature
      return macaroon.signature === currentSignature.toString('base64url');
    } catch (error) {
      return false;
    }
  }

  private async verifyCaveat(
    caveat: MacaroonCaveat,
    context: MacaroonAuthContext
  ): Promise<boolean> {
    const { key, operator, value } = caveat.condition;

    switch (caveat.namespace) {
      case 'time':
        return this.verifyTimeCaveat(key, operator, value);
      case 'auth':
        return this.verifyCapabilityCaveat(key, operator, value, context);
      default:
        return false;
    }
  }

  private verifyTimeCaveat(
    key: string,
    operator: string,
    value: string | number
  ): boolean {
    if (key !== 'expiration' || operator !== '<') {
      return false;
    }

    const expiryTime = new Date(value.toString()).getTime();
    const now = Date.now();

    return now < expiryTime;
  }

  private verifyCapabilityCaveat(
    key: string,
    operator: string,
    value: string | number,
    context: MacaroonAuthContext
  ): boolean {
    // For our streaming MVP, we only check if the capability is "stream"
    if (key !== 'capability' || operator !== '==') {
      return false;
    }

    return value === 'stream';
  }
}