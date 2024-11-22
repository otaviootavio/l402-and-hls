import rateLimit from 'express-rate-limit';

export function createRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const xForwardedFor = req.headers['x-forwarded-for'];
      const ip = xForwardedFor 
        ? (typeof xForwardedFor === 'string' 
          ? xForwardedFor.split(',')[0] 
          : xForwardedFor[0])
        : req.ip;
      return ip || 'unknown';
    },
    skip: (req) => req.path === '/health'
  });
}