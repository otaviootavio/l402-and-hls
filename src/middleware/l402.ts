import type {
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express";
import crypto from "crypto";

// Strong types for the L402 token structure
interface L402Token {
  readonly macaroon: string;
  readonly preimage: string;
  readonly paymentHash: string;
}

// Configuration interface with specific types
interface L402Config {
  readonly secret: string;
  readonly price: number;
  readonly timeoutSeconds: number;
}

// Extend Express Request to include L402 token
interface Request extends ExpressRequest {
  l402Token?: L402Token;
}

// Strong types for macaroon data structure
interface MacaroonData {
  readonly paymentHash: string;
  readonly timestamp: number;
  readonly expiryTime: number;
}

interface SignedMacaroonData extends MacaroonData {
  readonly signature: string;
}

// Type for challenge response
interface L402Challenge {
  readonly paymentHash: string;
  readonly preimage: string;
}

// Type for error responses
interface L402Error {
  readonly message: string;
  readonly code: string;
  readonly details?: unknown;
}

// Result type for error handling
interface SuccessResult<T> {
  ok: true;
  value: T;
}

interface ErrorResult<E> {
  ok: false;
  error: E;
}

type Result<T, E> = SuccessResult<T> | ErrorResult<E>;

export class L402Middleware {
  private readonly config: Readonly<L402Config>;

  constructor(config: L402Config) {
    // Validate config
    if (!config.secret || typeof config.secret !== "string") {
      throw new Error("Invalid secret key");
    }
    if (!Number.isInteger(config.price) || config.price <= 0) {
      throw new Error("Price must be a positive integer");
    }
    if (
      !Number.isInteger(config.timeoutSeconds) ||
      config.timeoutSeconds <= 0
    ) {
      throw new Error("Timeout must be a positive integer");
    }

    this.config = Object.freeze({ ...config });
  }

  private generateChallenge(): L402Challenge {
    const preimage: Buffer = crypto.randomBytes(32);
    const paymentHash: Buffer = crypto
      .createHash("sha256")
      .update(preimage)
      .digest();

    return {
      paymentHash: paymentHash.toString("hex"),
      preimage: preimage.toString("hex"),
    };
  }

  private createMacaroon(paymentHash: string): string {
    const macaroonData: MacaroonData = {
      paymentHash,
      timestamp: Date.now(),
      expiryTime: Date.now() + this.config.timeoutSeconds * 1000,
    };

    const signature: string = crypto
      .createHmac("sha256", this.config.secret)
      .update(JSON.stringify(macaroonData))
      .digest("hex");

    const signedData: SignedMacaroonData = {
      ...macaroonData,
      signature,
    };

    return Buffer.from(JSON.stringify(signedData)).toString("base64");
  }

  private verifyMacaroon(
    macaroon: string
  ): Result<SignedMacaroonData, L402Error> {
    try {
      const decodedMacaroon: SignedMacaroonData = JSON.parse(
        Buffer.from(macaroon, "base64").toString()
      );

      const { signature, ...data } = decodedMacaroon;
      const expectedSignature: string = crypto
        .createHmac("sha256", this.config.secret)
        .update(JSON.stringify(data))
        .digest("hex");

      if (signature !== expectedSignature) {
        return {
          ok: false,
          error: {
            message: "Invalid signature",
            code: "INVALID_SIGNATURE",
          },
        };
      }

      if (decodedMacaroon.expiryTime < Date.now()) {
        return {
          ok: false,
          error: {
            message: "Macaroon expired",
            code: "MACAROON_EXPIRED",
          },
        };
      }

      return { ok: true, value: decodedMacaroon };
    } catch (error) {
      return {
        ok: false,
        error: {
          message: "Invalid macaroon format",
          code: "INVALID_FORMAT",
          details: error,
        },
      };
    }
  }

  public authorize = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authHeader: string | undefined = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("L402 ")) {
      const challenge: L402Challenge = this.generateChallenge();
      const macaroon: string = this.createMacaroon(challenge.paymentHash);

      res.setHeader(
        "WWW-Authenticate",
        `L402 macaroon="${macaroon}", invoice="lnbc${this.config.price}"`
      );
      res.status(402).json({
        message: "Payment Required",
        paymentHash: challenge.paymentHash,
        price: this.config.price,
      });
      return;
    }

    try {
      const tokenParts = authHeader.split("L402 ");
      if (tokenParts.length !== 2) {
        throw new Error("Invalid token format");
      }

      const [macaroon, preimage] = tokenParts[1].split(":");
      if (!macaroon || !preimage) {
        throw new Error("Missing macaroon or preimage");
      }

      const macaroonResult = this.verifyMacaroon(macaroon);
      if (!macaroonResult.ok) {
        res.status(401).json(macaroonResult.error);
        return;
      }

      const providedPaymentHash: string = crypto
        .createHash("sha256")
        .update(Buffer.from(preimage, "hex"))
        .digest("hex");

      if (providedPaymentHash !== macaroonResult.value.paymentHash) {
        res.status(401).json({
          message: "Invalid preimage",
          code: "INVALID_PREIMAGE",
        });
        return;
      }

      req.l402Token = {
        macaroon,
        preimage,
        paymentHash: providedPaymentHash,
      };

      next();
    } catch (error) {
      res.status(401).json({
        message: "Invalid L402 token format",
        code: "INVALID_TOKEN_FORMAT",
        details: error,
      });
    }
  };
}
