import * as jwt from "jsonwebtoken";
import type { TokenMetadata } from "./types";
import type { ITokenService } from "./interfaces";

export class TokenService implements ITokenService {
  private readonly hmacSecret: string;

  constructor(hmacSecret: string) {
    this.hmacSecret = hmacSecret;
  }

  generateToken(metadata: TokenMetadata): string {
    const payload = {
      ...metadata,
      iat: metadata.issuedAt,
      exp: metadata.expiresAt,
    };

    return jwt.sign(payload, this.hmacSecret, { 
      algorithm: "HS256",
    });
  }

  verifyToken(token: string): boolean {
    try {
      const decoded = jwt.verify(token, this.hmacSecret, {
        clockTolerance: 1 // Add 1 second tolerance for clock skew
      }) as TokenMetadata & {
        iat: number;
        exp: number;
      };

      const now = Math.floor(Date.now() / 1000);

      // Log verification attempt
      console.log('Token verification:', {
        now,
        tokenExpiresAt: decoded.expiresAt,
        timeRemaining: decoded.expiresAt - now,
      });

      return now <= decoded.expiresAt;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('Token expired:', {
          expiredAt: error.expiredAt,
          now: new Date(),
        });
      } else {
        console.error('Token verification error:', error);
      }
      return false;
    }
  }

  // Helper method for testing
  decodeToken(token: string): TokenMetadata | null {
    try {
      return jwt.verify(token, this.hmacSecret) as TokenMetadata;
    } catch (error) {
      console.log('Token decode error:', error);
      return null;
    }
  }
}