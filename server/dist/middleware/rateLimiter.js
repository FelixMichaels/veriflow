"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.generalRateLimiter = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
// Rate limiter for general API requests
const rateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Number of requests
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // Per 15 minutes (in seconds)
    blockDuration: 900, // Block for 15 minutes if limit exceeded
});
const generalRateLimiter = async (req, res, next) => {
    try {
        const key = req.ip; // Use IP address as key
        await rateLimiter.consume(key);
        next();
    }
    catch (rejRes) {
        const remainingPoints = rejRes?.remainingPoints || 0;
        const msBeforeNext = rejRes?.msBeforeNext || 0;
        res.set({
            'Retry-After': String(Math.round(msBeforeNext / 1000)),
            'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '100',
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
exports.generalRateLimiter = generalRateLimiter;
exports.rateLimiter = exports.generalRateLimiter;
