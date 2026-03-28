import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.', code: 'AUTH_RATE_LIMIT' },
  skipSuccessfulRequests: true,
});

export const disruptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many disruption requests.', code: 'DISRUPTION_RATE_LIMIT' },
});
