import crypto from "crypto";
import { CONSTANTS } from "../../config/contants";
import { L402Error } from "./L402Error";
import type { SignedMacaroonData, VersionedMacaroonData } from "./types/token";

export class MacaroonService {
  constructor(private readonly secret: string) {}

  create(
    paymentHash: string,
    expiryTime: number,
    keyId: string,
    maxUses: number,
    metadata?: { price: number; description: string }
  ): string {
    const macaroonData: VersionedMacaroonData = {
      version: CONSTANTS.DEFAULT_VERSION,
      keyId,
      paymentHash,
      timestamp: Date.now(),
      expiryTime,
      maxUses,
      metadata,
    };

    const signature = this.sign(macaroonData);
    const signedData: SignedMacaroonData = { ...macaroonData, signature };

    return Buffer.from(JSON.stringify(signedData)).toString("base64");
  }

  verify(macaroon: string): SignedMacaroonData {
    try {
      const decodedMacaroon: SignedMacaroonData = JSON.parse(
        Buffer.from(macaroon, "base64").toString()
      );

      const { signature, ...data } = decodedMacaroon;
      const expectedSignature = this.sign(data);

      if (
        !crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        )
      ) {
        throw new L402Error("Invalid signature", "INVALID_SIGNATURE", 401);
      }

      if (decodedMacaroon.expiryTime < Date.now()) {
        throw new L402Error("Macaroon expired", "MACAROON_EXPIRED", 401);
      }

      return decodedMacaroon;
    } catch (error) {
      if (error instanceof L402Error) throw error;
      throw new L402Error(
        "Invalid macaroon format",
        "INVALID_FORMAT",
        401,
        error
      );
    }
  }

  private sign(data: VersionedMacaroonData): string {
    const dataToSign = JSON.stringify(data);
    const hmac = crypto.createHmac(CONSTANTS.HASH_ALGORITHM, this.secret);
    hmac.update(dataToSign);
    return hmac.digest("hex");
  }
}
