import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter for general API requests
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Number of requests (increased for dev)
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // Per 15 minutes (in seconds)
  blockDuration: process.env.NODE_ENV === 'production' ? 900 : 10, // Block for 10 seconds in dev, 15 min in prod
});

export const generalRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting in development for localhost
  if (process.env.NODE_ENV === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1')) {
    return next();
  }

  try {
    const key = req.ip; // Use IP address as key
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;

    res.set({
      'Retry-After': String(Math.round(msBeforeNext / 1000)),
      'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '1000',
      'X-RateLimit-Remaining': String(remainingPoints),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });

    res.status(429).json({
      success: false,
      error: {
        error: 'TooManyRequests',
        message: 'Too many requests, please try again later.',
      },
    });
  }
};

// Export the general rate limiter as default
export { generalRateLimiter as rateLimiter };