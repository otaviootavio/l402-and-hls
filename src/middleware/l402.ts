import type {
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express";
import crypto from "crypto";
import { createInvoice, getInvoice, type AuthenticatedLnd } from "lightning";

// Types
interface L402Token {
  readonly macaroon: string;
  readonly preimage: string;
  readonly paymentHash: string;
  readonly expiry: number;
}

interface L402Config {
  readonly secret: string;
  readonly priceSats: number;
  readonly timeoutSeconds: number;
  readonly description?: string;
}

interface Request extends ExpressRequest {
  l402Token?: L402Token;
}

interface MacaroonData {
  readonly paymentHash: string;
  readonly timestamp: number;
  readonly expiryTime: number;
  readonly metadata?: {
    price: number;
    description: string;
  };
}

interface SignedMacaroonData extends MacaroonData {
  readonly signature: string;
}

class L402Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "L402Error";
  }
}

const CONSTANTS = {
  HASH_ALGORITHM: "sha256",
  AUTH_SCHEME: "L402",
  MIN_PREIMAGE_LENGTH: 64,
  TOKEN_SEPARATOR: ":",
} as const;

export class L402Middleware {
  private readonly config: Required<L402Config>;

  constructor(config: L402Config, private readonly lnd: AuthenticatedLnd) {
    this.validateConfig(config);
    this.config = {
      ...config,
      description: config.description || "L402 API Access Token",
    };
  }

  private validateConfig(config: L402Config): void {
    if (!config.secret || typeof config.secret !== "string") {
      throw new L402Error("Invalid secret key", "INVALID_CONFIG", 500);
    }
    if (!Number.isInteger(config.priceSats) || config.priceSats <= 0) {
      throw new L402Error(
        "Price must be a positive integer",
        "INVALID_CONFIG",
        500
      );
    }
    if (
      !Number.isInteger(config.timeoutSeconds) ||
      config.timeoutSeconds <= 0
    ) {
      throw new L402Error(
        "Timeout must be a positive integer",
        "INVALID_CONFIG",
        500
      );
    }
  }

  private async createChallenge(): Promise<{
    macaroon: string;
    invoice: string;
    paymentHash: string;
  }> {
    try {
      // Using createInvoice from the lightning package
      const createdInvoice = await createInvoice({
        lnd: this.lnd,
        tokens: this.config.priceSats,
        description: this.config.description,
      });

      console.log("Created invoice:", createdInvoice); // For debugging

      const paymentHash = createdInvoice.id;
      const expiryTime = Date.now() + this.config.timeoutSeconds * 1000;
      const macaroon = this.createMacaroon(paymentHash, expiryTime);

      return {
        macaroon,
        invoice: createdInvoice.request,
        paymentHash,
      };
    } catch (error) {
      console.error("Invoice creation error:", error); // For debugging
      throw new L402Error(
        "Failed to create challenge",
        "CHALLENGE_CREATION_FAILED",
        500,
        error
      );
    }
  }

  private createMacaroon(paymentHash: string, expiryTime: number): string {
    const macaroonData: MacaroonData = {
      paymentHash,
      timestamp: Date.now(),
      expiryTime,
      metadata: {
        price: this.config.priceSats,
        description: this.config.description,
      },
    };

    const signature = this.signMacaroon(macaroonData);
    const signedData: SignedMacaroonData = { ...macaroonData, signature };

    return Buffer.from(JSON.stringify(signedData)).toString("base64");
  }

  private signMacaroon(data: MacaroonData): string {
    return crypto
      .createHmac(CONSTANTS.HASH_ALGORITHM, this.config.secret)
      .update(JSON.stringify(data))
      .digest("hex");
  }

  private verifyMacaroon(macaroon: string): SignedMacaroonData {
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

  private validatePreimage(preimage: string, paymentHash: string): void {
    if (!preimage || preimage.length !== CONSTANTS.MIN_PREIMAGE_LENGTH) {
      throw new L402Error("Invalid preimage format", "INVALID_PREIMAGE", 401);
    }

    const calculatedHash = crypto
      .createHash(CONSTANTS.HASH_ALGORITHM)
      .update(Buffer.from(preimage, "hex"))
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(calculatedHash),
        Buffer.from(paymentHash)
      )
    ) {
      throw new L402Error("Invalid preimage", "INVALID_PREIMAGE", 401);
    }
  }

  private async verifyLightningPayment(paymentHash: string): Promise<boolean> {
    try {
      console.log("Verifying payment hash:", paymentHash);

      const invoice = await getInvoice({
        lnd: this.lnd,
        id: paymentHash,
      });

      console.log("Invoice details:", invoice);
      return invoice.is_confirmed;
    } catch (error) {
      console.error("Verification error:", error);

      console.error("Fallback verification failed:", error);
      throw new L402Error(
        "Failed to verify payment",
        "PAYMENT_VERIFICATION_FAILED",
        400,
        error
      );
    }
  }

  public authorize = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith(CONSTANTS.AUTH_SCHEME)) {
        const challenge = await this.createChallenge();
        res.setHeader(
          "WWW-Authenticate",
          `${CONSTANTS.AUTH_SCHEME} macaroon="${challenge.macaroon}", invoice="${challenge.invoice}"`
        );
        res.status(402).json({
          message: "Payment Required",
          paymentHash: challenge.paymentHash,
          price: this.config.priceSats,
          description: this.config.description,
        });
        return;
      }

      // Debug the string manipulation
      const tokenPart = authHeader.slice(CONSTANTS.AUTH_SCHEME.length + 1);

      // Check for the separator in the string
      console.log(
        "Separator exists at:",
        tokenPart.indexOf(CONSTANTS.TOKEN_SEPARATOR)
      );

      const parts = tokenPart.split(CONSTANTS.TOKEN_SEPARATOR);

      const [macaroon, preimage] = parts;

      if (!macaroon || !preimage) {
        throw new L402Error(
          "Missing macaroon or preimage",
          "INVALID_TOKEN",
          401
        );
      }

      const macaroonData = this.verifyMacaroon(macaroon);
      this.validatePreimage(preimage, macaroonData.paymentHash);

      console.log("Macaroon data:", macaroonData);
      console.log("Preimage validated, attempting payment verification");

      const isPaid = await this.verifyLightningPayment(
        macaroonData.paymentHash
      );
      if (!isPaid) {
        throw new L402Error(
          "Payment not confirmed",
          "PAYMENT_NOT_CONFIRMED",
          401
        );
      }

      req.l402Token = {
        macaroon,
        preimage,
        paymentHash: macaroonData.paymentHash,
        expiry: macaroonData.expiryTime,
      };

      next();
    } catch (error) {
      if (error instanceof L402Error) {
        res.status(error.statusCode).json({
          message: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }

      res.status(500).json({
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error,
      });
    }
  };
}
