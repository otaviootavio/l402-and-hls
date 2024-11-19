import * as jwt from "jsonwebtoken";
import type { TokenMetadata } from "./types";
import type { ITokenService } from "./interfaces";

export class TokenService implements ITokenService {
  private readonly hmacSecret: string;

  constructor(hmacSecret: string) {
    this.hmacSecret = hmacSecret;
  }

  generateToken(metadata: TokenMetadata): string {
    return jwt.sign(metadata, this.hmacSecret, { algorithm: "HS256" });
  }

  verifyToken(token: string): boolean {
    try {
      jwt.verify(token, this.hmacSecret);
      return true;
    } catch {
      return false;
    }
  }
}
