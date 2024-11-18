import crypto from 'crypto';
import { CONSTANTS } from '../../config/contants';
import { L402Error } from './L402Error';
import { DefaultMacaroonBuilder } from './macaroon-builder';
import type {
    MacaroonMinter,
    MacaroonMinterConfig,
    MacaroonMintResult,
    MacaroonVerificationResult,
    L402Macaroon,
    MacaroonIdentifier,
} from './types/token';

export class DefaultMacaroonMinter implements MacaroonMinter {
    private readonly builder: DefaultMacaroonBuilder;

    constructor(private readonly config: MacaroonMinterConfig) {
        this.builder = new DefaultMacaroonBuilder(config.secret);
    }

    public mint({
        paymentHash,
        expiryTime,
        metadata = {}
    }: Parameters<MacaroonMinter['mint']>[0]): MacaroonMintResult {
        try {
            const actualExpiryTime = this.calculateExpiryTime(expiryTime);
            const identifier = this.createIdentifier(paymentHash);
            
            // Add caveats only here in the minter
            this.builder
                .setLocation(this.config.serviceName)
                .setIdentifier(identifier)
                // Add time expiration caveat
                .addCaveat({
                    key: "expiration",
                    operator: "<",
                    value: actualExpiryTime
                }, "time")
                // Add streaming capability caveat
                .addCaveat({
                    key: "capability",
                    operator: "==",
                    value: "stream"
                }, "auth");

            const macaroon = this.builder.buildL402Macaroon({
                paymentAmount: this.validatePaymentAmount(metadata.price),
                service: this.config.serviceName,
                tier: this.config.defaultTier,
                capabilities: ["stream"],
                expiresAt: actualExpiryTime,
            });

            return {
                macaroon: Buffer.from(JSON.stringify(macaroon)).toString('base64url'),
                paymentHash
            };
        } catch (error) {
            throw new L402Error(
                'Failed to mint macaroon',
                'MINT_ERROR',
                500,
                error
            );
        }
    }

    public verify({
        macaroon,
        preimage
    }: Parameters<MacaroonMinter['verify']>[0]): MacaroonVerificationResult {
        try {
            const decodedMacaroon = this.decodeMacaroon(macaroon);
            
            // Verify macaroon structure
            this.validateMacaroonStructure(decodedMacaroon);

            // Verify signature chain
            const isValidSignature = this.verifySignatureChain(decodedMacaroon);
            if (!isValidSignature) {
                return {
                    isValid: false,
                    error: 'Invalid signature chain'
                };
            }



            return {
                isValid: true,
                data: {
                    macaroon: decodedMacaroon,
                    verifiedCaveats: {
                        firstParty: decodedMacaroon.caveats,
                        thirdParty: decodedMacaroon.thirdPartyCaveats
                    }
                }
            };
        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public async revoke(paymentHash: string): Promise<void> {
        // Implementation for revoking macaroons
        throw new Error('Revocation not implemented');
    }

    private createIdentifier(paymentHash: string): MacaroonIdentifier {
        return {
            version: 1,
            paymentHash,
            userId: crypto.randomBytes(32).toString('hex')
        };
    }

    private calculateExpiryTime(expiryTime?: number): string {
        const timestamp = expiryTime || Date.now() + (this.config.defaultExpirySeconds * 1000);
        return new Date(timestamp).toISOString();
    }

    private formatCapabilities(capabilities: unknown): string[] {
        if (typeof capabilities === 'string') {
            return capabilities.split(',').map(c => c.trim()).filter(Boolean);
        }
        if (Array.isArray(capabilities)) {
            return capabilities.filter(c => typeof c === 'string');
        }
        return [];
    }

    private validatePaymentAmount(price: unknown): number {
        const amount = Number(price);
        if (isNaN(amount) || amount < 0) {
            return 0;
        }
        return amount;
    }

    private validateCapabilities(capabilities: string[]): string[] {
        if (capabilities.length === 0) {
            return this.config.capabilities;
        }
        return capabilities.filter(cap => this.config.capabilities.includes(cap));
    }

    private decodeMacaroon(macaroon: string): L402Macaroon {
        try {
            return JSON.parse(Buffer.from(macaroon, 'base64url').toString());
        } catch (error) {
            throw new L402Error('Invalid macaroon format', 'INVALID_MACAROON', 400);
        }
    }

    private validateMacaroonStructure(macaroon: L402Macaroon): void {
        const requiredFields = ['identifier', 'location', 'caveats', 'signature'];
        for (const field of requiredFields) {
            if (!macaroon[field as keyof L402Macaroon]) {
                throw new L402Error(
                    `Missing required field: ${field}`,
                    'INVALID_MACAROON_STRUCTURE',
                    400
                );
            }
        }
    }

    private verifySignatureChain(macaroon: L402Macaroon): boolean {
        const builder = new DefaultMacaroonBuilder(this.config.secret)
            .setLocation(macaroon.location)
            .setIdentifier(JSON.parse(
                Buffer.from(macaroon.identifier, 'base64url').toString()
            ));

        // Replay all caveats to rebuild the signature chain
        for (const caveat of macaroon.caveats) {
            builder.addCaveat(caveat.condition, caveat.namespace);
        }

        for (const caveat of macaroon.thirdPartyCaveats) {
            builder.addThirdPartyCaveat(caveat);
        }

        const reconstructed = builder.build();
        return reconstructed.signature === macaroon.signature;
    }

    private verifyPreimage(preimage: string, paymentHash: string): boolean {
        if (!this.isValidHexString(preimage, 64)) {
            return false;
        }

        const calculatedHash = crypto
            .createHash(CONSTANTS.HASH_ALGORITHM)
            .update(Buffer.from(preimage, 'hex'))
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(calculatedHash),
            Buffer.from(paymentHash)
        );
    }

    private isValidHexString(str: string, length: number): boolean {
        return Boolean(str.match(new RegExp(`^[a-f0-9]{${length}}$`, 'i')));
    }
}