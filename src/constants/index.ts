export const CONSTANTS = {
    HASH_ALGORITHM: 'sha256',
    AUTH_SCHEME: 'L402',
    MIN_PREIMAGE_LENGTH: 64,
    TOKEN_SEPARATOR: ':',
    DEFAULT_VERSION: 1,
    MIN_PRICE_SATS: 1,
    MAX_TIMEOUT_SECONDS: 86400, // 24 hours
    ALLOWED_HEADERS: ['authorization', 'content-type'] as const,
  } as const;
  