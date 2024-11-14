import type { 
  MacaroonAuthorizer,
  MacaroonAuthorizerConfig,
  MacaroonAuthContext,
  L402Macaroon,
  MacaroonCaveat,
  ThirdPartyCaveat,
  CaveatCondition
} from './types/token';
import { L402Error } from './L402Error';

export class DefaultMacaroonAuthorizer implements MacaroonAuthorizer {
  constructor(private readonly config: MacaroonAuthorizerConfig) {}

  public async authorize({
      macaroon,
      context
  }: {
      macaroon: L402Macaroon;
      context: MacaroonAuthContext;
  }): Promise<boolean> {
      try {
          // Basic requirements validation
          this.validateBasicRequirements(macaroon, context);

          // Verify all caveats
          await this.verifyCaveats(macaroon.caveats, context);

          // Verify third-party caveats if present
          if (macaroon.thirdPartyCaveats.length > 0) {
              await this.verifyThirdPartyCaveats(macaroon.thirdPartyCaveats, context);
          }

          // Verify L402-specific restrictions
          await this.verifyL402Restrictions(macaroon, context);

          return true;
      } catch (error) {
          if (error instanceof L402Error) {
              throw error;
          }
          throw new L402Error(
              'Authorization failed',
              'AUTH_FAILED',
              401,
              error
          );
      }
  }

  private validateBasicRequirements(
      macaroon: L402Macaroon,
      context: MacaroonAuthContext
  ): void {
      // Service validation
      if (macaroon.restrictions.service !== this.config.serviceName) {
          throw new L402Error(
              'Invalid service name',
              'INVALID_SERVICE',
              401
          );
      }

      // Tier validation
      if (macaroon.restrictions.tier < this.config.defaultTier) {
          throw new L402Error(
              'Insufficient service tier',
              'INVALID_TIER',
              401
          );
      }

      // Expiration validation
      const expiryTime = new Date(macaroon.restrictions.expiresAt).getTime();
      if (expiryTime < Date.now()) {
          throw new L402Error(
              'Macaroon has expired',
              'EXPIRED',
              401
          );
      }
  }

  private async verifyCaveats(
      caveats: MacaroonCaveat[],
      context: MacaroonAuthContext
  ): Promise<void> {
      for (const caveat of caveats) {
          const isValid = await this.verifyCaveat(caveat, context);
          if (!isValid) {
              throw new L402Error(
                  `Failed to verify caveat: ${JSON.stringify(caveat.condition)}`,
                  'INVALID_CAVEAT',
                  401
              );
          }
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
              return this.verifyAuthCaveat(key, operator, value, context);
          case 'usage':
              return this.verifyUsageCaveat(key, operator, value, context);
          default:
              return this.verifyGenericCaveat(key, operator, value, context);
      }
  }

  private verifyTimeCaveat(
      key: string,
      operator: string,
      value: string | number
  ): boolean {
      if (key !== 'expiration') return false;

      const timestamp = new Date(value.toString()).getTime();
      const now = Date.now();

      switch (operator) {
          case '<': return now < timestamp;
          case '<=': return now <= timestamp;
          case '>': return now > timestamp;
          case '>=': return now >= timestamp;
          default: return false;
      }
  }

  private verifyAuthCaveat(
      key: string,
      operator: string,
      value: string | number,
      context: MacaroonAuthContext
  ): boolean {
      switch (key) {
          case 'service-capability':
              return operator === '==' && value === context.service;
          case 'capability':
              return operator === '==' && 
                     context.capability !== undefined &&
                     value === context.capability;
          default:
              return false;
      }
  }

  private verifyUsageCaveat(
      key: string,
      operator: string,
      value: string | number,
      context: MacaroonAuthContext
  ): boolean {
      if (key !== 'request-limit') return false;
      if (!context.usageCount) return true;

      const limit = Number(value);
      switch (operator) {
          case '<': return context.usageCount < limit;
          case '<=': return context.usageCount <= limit;
          default: return false;
      }
  }

  private verifyGenericCaveat(
      key: string,
      operator: string,
      value: string | number,
      context: MacaroonAuthContext
  ): boolean {
      // Handle custom caveat types
      return false;
  }

  private async verifyThirdPartyCaveats(
      caveats: ThirdPartyCaveat[],
      context: MacaroonAuthContext
  ): Promise<void> {
      for (const caveat of caveats) {
          const isValid = await this.verifyThirdPartyCaveat(caveat, context);
          if (!isValid) {
              throw new L402Error(
                  `Failed to verify third-party caveat: ${caveat.identifier}`,
                  'INVALID_THIRD_PARTY_CAVEAT',
                  401
              );
          }
      }
  }

  private async verifyThirdPartyCaveat(
      caveat: ThirdPartyCaveat,
      context: MacaroonAuthContext
  ): Promise<boolean> {
      // Implement third-party verification logic here
      // This could involve making HTTP requests to third-party services
      return true;
  }

  private async verifyL402Restrictions(
      macaroon: L402Macaroon,
      context: MacaroonAuthContext
  ): Promise<void> {
      // Verify capabilities
      if (context.capability) {
          if (!macaroon.restrictions.capabilities.includes(context.capability)) {
              throw new L402Error(
                  'Unauthorized capability',
                  'UNAUTHORIZED_CAPABILITY',
                  401
              );
          }
      }

      // Verify usage limits
      if (macaroon.restrictions.maxUses !== undefined && context.usageCount !== undefined) {
          if (context.usageCount >= macaroon.restrictions.maxUses) {
              throw new L402Error(
                  'Usage limit exceeded',
                  'USAGE_LIMIT_EXCEEDED',
                  401
              );
          }
      }
  }
}