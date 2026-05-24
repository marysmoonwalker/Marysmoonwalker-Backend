import { Request, Response, NextFunction } from 'express';
import { Visitor } from '../models/Visitor.model';
import { resolveLocation } from '../utils/resolveLocation';

/**
 * Middleware that logs every incoming page request to the Visitor collection.
 * Resolves the real client IP (respects x-forwarded-for for proxied environments),
 * looks up country and city via geoip-lite, then saves the visit document.
 *
 * This runs fire-and-forget — it never blocks the request pipeline.
 * Any error during tracking is silently logged and the request continues normally.
 */
export const trackVisitor = (req: Request, res: Response, next: NextFunction): void => {
    next();

    if (req.originalUrl.startsWith('/api')) return;

    setImmediate(async () => {
        try {
            const forwarded = req.headers['x-forwarded-for'];
            const rawIp     =
                (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim())
                ?? req.ip
                ?? '';

            const { country } = resolveLocation(rawIp);

            if (country === 'Unknown') return;

            const date = new Date().toISOString().slice(0, 10);

            await Visitor.findOneAndUpdate(
                { country, date },
                {
                    $inc:      { hits: 1 },
                    $addToSet: { uniqueIps: rawIp },
                },
                { upsert: true, new: true },
            );
        } catch (error) {
            console.error(`[${new Date().toISOString()}] [ERROR] [trackVisitor]: ${
                error instanceof Error ? error.message : String(error)
            }`);
        }
    });
};