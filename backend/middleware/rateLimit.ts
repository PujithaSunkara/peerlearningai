import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    message: 'AI analysis rate limit reached. Please wait a few minutes before submitting another AI request.',
  },
});

