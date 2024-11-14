import crypto from 'crypto';
import { CONSTANTS } from '../../config/contants';
import { L402Error } from './L402Error';
import type {
  Macaroon,
  MacaroonBuilder,
  MacaroonIdentifier,
  MacaroonCaveat,
  ThirdPartyCaveat,
  CaveatCondition,
  L402Macaroon,
  L402BuildParams,
} from './types/token';

export class DefaultMacaroonBuilder implements MacaroonBuilder {
  private macaroon: Partial<Macaroon> = {
    location: '',
    identifier: '',
    caveats: [],
    thirdPartyCaveats: [],
    signature: ''
  };

  private currentSignature: Buffer;

  constructor(private readonly secret: string) {
    this.currentSignature = this.initializeSignature();
  }

  private initializeSignature(): Buffer {
    return crypto
      .createHmac(CONSTANTS.HASH_ALGORITHM, this.secret)
      .update('')
      .digest();
  }

  private encodeBase64(data: unknown): string {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  private updateSignature(data: string | Buffer): void {
    const hmac = crypto.createHmac(CONSTANTS.HASH_ALGORITHM, this.currentSignature);
    hmac.update(typeof data === 'string' ? data : data);
    this.currentSignature = hmac.digest();
  }

  private signCaveat(data: string): string {
    const hmac = crypto.createHmac(CONSTANTS.HASH_ALGORITHM, this.currentSignature);
    hmac.update(data);
    return hmac.digest('base64url');
  }

  public setLocation(location: string): this {
    this.macaroon.location = location;
    this.updateSignature(location);
    return this;
  }

  public setIdentifier(data: MacaroonIdentifier): this {
    const identifierStr = this.encodeBase64(data);
    this.macaroon.identifier = identifierStr;
    this.updateSignature(identifierStr);
    return this;
  }

  public addCaveat(condition: CaveatCondition, namespace?: string): this {
    const caveatStr = JSON.stringify({ ...condition, namespace });
    const caveat: MacaroonCaveat = {
      condition,
      namespace,
      signature: this.signCaveat(caveatStr)
    };
    
    this.macaroon.caveats!.push(caveat);
    this.updateSignature(caveat.signature);
    return this;
  }

  public addThirdPartyCaveat(caveat: Omit<ThirdPartyCaveat, 'signature'>): this {
    const thirdPartyCaveat: ThirdPartyCaveat = {
      ...caveat,
      verificationKey: this.generateVerificationKey(caveat.identifier)
    };
    
    this.macaroon.thirdPartyCaveats!.push(thirdPartyCaveat);
    this.updateSignature(this.encodeBase64(thirdPartyCaveat));
    return this;
  }

  private generateVerificationKey(identifier: string): string {
    return crypto
      .createHmac(CONSTANTS.HASH_ALGORITHM, this.secret)
      .update(identifier)
      .digest('base64url');
  }

  private validateMacaroon(): void {
    if (!this.macaroon.location) {
      throw new L402Error("Location is required", "INVALID_MACAROON", 400);
    }

    if (!this.macaroon.identifier) {
      throw new L402Error("Identifier is required", "INVALID_MACAROON", 400);
    }

    if (!this.macaroon.caveats?.length) {
      throw new L402Error(
        "At least one caveat is required",
        "INVALID_MACAROON",
        400
      );
    }
  }

  public build(): Macaroon {
    this.validateMacaroon();
    
    return {
      ...this.macaroon as Macaroon,
      signature: this.currentSignature.toString('base64url')
    };
  }

  public buildL402Macaroon(params: L402BuildParams): L402Macaroon {
    // Reset caveats
    this.macaroon.caveats = [];
    this.macaroon.thirdPartyCaveats = [];

    // Add L402-specific caveats
    this.addCaveat({
      key: 'expiration',
      operator: '<',
      value: params.expiresAt
    }, 'time');

    if (params.capabilities.length > 0) {
      this.addCaveat({
        key: 'service-capability',
        operator: '==',
        value: params.service
      }, 'auth');

      params.capabilities.forEach(cap => {
        this.addCaveat({
          key: 'capability',
          operator: '==',
          value: cap
        }, 'auth');
      });
    }

    if (params.maxUses) {
      this.addCaveat({
        key: 'request-limit',
        operator: '<',
        value: params.maxUses
      }, 'usage');
    }

    const baseMacaroon = this.build();
    const identifierData: MacaroonIdentifier = JSON.parse(
      Buffer.from(baseMacaroon.identifier, 'base64url').toString()
    );

    return {
      ...baseMacaroon,
      paymentInfo: {
        hash: identifierData.paymentHash,
        amount: params.paymentAmount,
        timestamp: identifierData.timestamp
      },
      restrictions: {
        expiresAt: params.expiresAt,
        maxUses: params.maxUses,
        service: params.service,
        tier: params.tier,
        capabilities: params.capabilities
      }
    };
  }
}