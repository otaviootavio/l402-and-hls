import { CONSTANTS } from "../constants";
import { L402Error } from "../errors/L402Error";
import type { L402Config } from "../types/config";
import crypto from "crypto";

export class ValidationUtils {
  static validateConfig(config: L402Config): void {
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
      config.timeoutSeconds <= 0 ||
      config.timeoutSeconds > CONSTANTS.MAX_TIMEOUT_SECONDS
    ) {
      throw new L402Error(
        'Invalid timeout configuration',
        'INVALID_CONFIG',
        500
      );
    }
  }

  static validatePreimage(preimage: string, paymentHash: string): void {
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
}