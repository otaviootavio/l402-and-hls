import { CONSTANTS } from "../middleware/l402/contants";
import { L402Error } from "../middleware/l402/L402Error";
import type { L402Config } from "../types/config";
import type { L402Logger } from "../middleware/l402/logger";
import type {
  SignedMacaroonData,
  VersionedMacaroonData,
} from "../middleware/l402/types/token";
import crypto from "crypto";

export class MacaroonService {
  constructor(
    private readonly config: Required<L402Config>,
    private readonly logger: L402Logger
  ) {}

  createMacaroon(paymentHash: string, expiryTime: number): string {
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

    return Buffer.from(JSON.stringify(signedData)).toString("base64");
  }

  verifyMacaroon(macaroon: string): SignedMacaroonData {
    try {
      const decodedMacaroon: SignedMacaroonData = JSON.parse(
        Buffer.from(macaroon, "base64").toString()
      );

      const { signature, ...data } = decodedMacaroon;
      const expectedSignature = this.signMacaroon(data);

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

  private signMacaroon(data: VersionedMacaroonData): string {
    const dataToSign = JSON.stringify(data);
    const hmac = crypto.createHmac(
      CONSTANTS.HASH_ALGORITHM,
      this.config.secret
    );
    hmac.update(dataToSign);
    return hmac.digest("hex");
  }
}
