import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        message: 'Too many attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: {
        message: 'Too many requests from this IP, please try again in an hour'
    }
});