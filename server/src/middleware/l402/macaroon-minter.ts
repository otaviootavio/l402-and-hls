import { CONSTANTS } from "../../config/contants";
import { L402Error } from "./L402Error";
import type { MacaroonMinter, MacaroonMinterConfig, MacaroonMinterVerifyResult, MacaroonMintResult } from "./types/macaroon-minter";
import type { MacaroonMetadata, SignedMacaroonData, VersionedMacaroonData } from "./types/token";
import crypto from "crypto";

export class DefaultMacaroonMinter implements MacaroonMinter {
    constructor(private readonly config: MacaroonMinterConfig) { }

    mint({
        paymentHash,
        expiryTime,
        maxUses,
        metadata
    }: Parameters<MacaroonMinter["mint"]>[0]): MacaroonMintResult {
        const macaroonData: VersionedMacaroonData = {
            version: CONSTANTS.DEFAULT_VERSION,
            keyId: this.config.keyId,
            paymentHash,
            timestamp: Date.now(),
            expiryTime: expiryTime || Date.now() + (this.config.defaultExpirySeconds * 1000),
            maxUses: maxUses || this.config.defaultMaxUses,
            metadata: metadata as MacaroonMetadata
        };

        const signature = this.sign(macaroonData);
        const signedData: SignedMacaroonData = { ...macaroonData, signature };
        const macaroon = Buffer.from(JSON.stringify(signedData)).toString("base64");

        return { macaroon, paymentHash };
    }


    verify({ macaroon, preimage }: Parameters<MacaroonMinter["verify"]>[0]): MacaroonMinterVerifyResult {
        try {
            const data = this.verifySignature(macaroon);
            this.verifyPreimage(preimage, data.paymentHash);

            return { isValid: true, data };
        } catch (error) {
            if (error instanceof L402Error) {
                return { isValid: false, data: null };
            }
            throw error;
        }
    }

    async revoke(paymentHash: string): Promise<void> {
        throw new Error("Not implemented");
    }

    private verifySignature(macaroon: string): SignedMacaroonData {
        try {
            const decodedMacaroon: SignedMacaroonData = JSON.parse(
                Buffer.from(macaroon, "base64").toString()
            );

            const { signature, ...data } = decodedMacaroon;
            const expectedSignature = this.sign(data);

            if (!crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            )) {
                throw new L402Error("Invalid signature", "INVALID_SIGNATURE", 401);
            }

            if (decodedMacaroon.expiryTime < Date.now()) {
                throw new L402Error("Macaroon expired", "MACAROON_EXPIRED", 401);
            }

            return decodedMacaroon;
        } catch (error) {
            if (error instanceof L402Error) throw error;
            throw new L402Error("Invalid macaroon format", "INVALID_FORMAT", 401, error);
        }
    }

    private verifyPreimage(preimage: string, paymentHash: string): void {
        if (!preimage?.match(/^[a-f0-9]{64}$/i)) {
            throw new L402Error("Invalid preimage format", "INVALID_PREIMAGE", 401);
        }

        const calculatedHash = crypto
            .createHash(CONSTANTS.HASH_ALGORITHM)
            .update(Buffer.from(preimage, "hex"))
            .digest("hex");

        if (!crypto.timingSafeEqual(
            Buffer.from(calculatedHash),
            Buffer.from(paymentHash)
        )) {
            throw new L402Error("Invalid preimage", "INVALID_PREIMAGE", 401);
        }
    }

    private sign(data: VersionedMacaroonData): string {
        const dataToSign = JSON.stringify(data);
        const hmac = crypto.createHmac(CONSTANTS.HASH_ALGORITHM, this.config.secret);
        hmac.update(dataToSign);
        return hmac.digest("hex");
    }
}