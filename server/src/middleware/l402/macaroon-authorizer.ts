import { L402Error } from "./L402Error";
import type { MacaroonAuthorizer, MacaroonAuthorizerConfig } from "./types/macaroon-authorizer";
import type { SignedMacaroonData } from "./types/token";


export class DefaultMacaroonAuthorizer implements MacaroonAuthorizer {
    constructor(private readonly config: MacaroonAuthorizerConfig) { }

    async authorize({
        macaroonData,
        context
    }: Parameters<MacaroonAuthorizer["authorize"]>[0]): Promise<boolean> {
        const servicesCaveat = this.findCaveat(macaroonData, "services");
        if (!servicesCaveat) {
            throw new L402Error(
                "Missing services caveat",
                "INVALID_CAVEAT",
                401
            );
        }

        const allowedServices = servicesCaveat.split(",");
        if (!allowedServices.includes(`${context.service}:${this.config.defaultTier}`)) {
            return false;
        }

        if (context.capability) {
            const capabilitiesCaveat = this.findCaveat(
                macaroonData,
                `${context.service}_capabilities`
            );

            if (capabilitiesCaveat) {
                const allowedCapabilities = capabilitiesCaveat.split(",");
                if (!allowedCapabilities.includes(context.capability)) {
                    return false;
                }
            }
        }

        return this.validateConstraints({ macaroonData, context });
    }

    async validateConstraints({
        macaroonData,
        context
    }: Parameters<MacaroonAuthorizer["validateConstraints"]>[0]): Promise<boolean> {
        return true;
    }

    private findCaveat(macaroonData: SignedMacaroonData, key: string): string | null {
        const metadata = macaroonData.metadata;
        if (!metadata) return null;

        const value = metadata[key];
        return value ? String(value) : null;
    }
}