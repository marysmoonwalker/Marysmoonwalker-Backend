import { Request, Response, NextFunction } from 'express';
import {
    subscribe,
    unsubscribe,
    saveContactMessage,
    getAllSubscribers,
    getAllContactMessages,
    markMessageRead,
} from '../services/outreach.service';

const logger = {
    info: (context: string, message: string) => {
        console.log(`[${new Date().toISOString()}] [INFO] [${context}]: ${message}`);
    },
    error: (context: string, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const stack   = error instanceof Error ? error.stack   : undefined;
        console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
        if (stack) console.error(stack);
    },
};

const resolveStatus = (error: unknown): number => {
    const status = (error as any).status;
    if (status === 409 || status === 404) return status;
    return 500;
};

/** req.params values are always strings at runtime — this cast is safe. */
const id = (param: string | string[]): string => param as string;

/**
 * POST /api/subscribe
 * Body: { email }
 */
export const handleSubscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email?.trim()) {
            res.status(400).json({ status: 'error', message: 'Email address is required.' });
            return;
        }

        await subscribe(email.trim().toLowerCase());

        res.status(201).json({
            status:  'success',
            message: 'Subscribed successfully. Check your inbox for a confirmation.',
        });
    } catch (error) {
        logger.error('handleSubscribe', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};

/**
 * GET /api/unsubscribe/:token
 * Linked from the footer of every subscription email.
 */
export const handleUnsubscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await unsubscribe(id(req.params.token));

        // Plain HTML response — the user clicks this link directly from their email client
        res.status(200).send(`
            <div style="font-family:Georgia,serif;text-align:center;padding:80px 24px;background:#0a0a0a;min-height:100vh;color:#c8c8c8;">
                <h2 style="color:#c9a84c;letter-spacing:2px;margin-bottom:16px;">You've been unsubscribed.</h2>
                <p style="font-size:15px;opacity:0.7;">You will no longer receive emails from Mary's Moonwalker.</p>
                <a href="https://marysmoonwalker.com" style="display:inline-block;margin-top:32px;color:#c9a84c;font-size:13px;letter-spacing:2px;text-decoration:none;text-transform:uppercase;">
                    Return to the site →
                </a>
            </div>
        `);
    } catch (error) {
        logger.error('handleUnsubscribe', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).send(`
                <div style="font-family:Georgia,serif;text-align:center;padding:80px 24px;background:#0a0a0a;min-height:100vh;color:#c8c8c8;">
                    <h2 style="color:#c9a84c;letter-spacing:2px;margin-bottom:16px;">Link not found.</h2>
                    <p style="font-size:15px;opacity:0.7;">This unsubscribe link is invalid or has already been used.</p>
                </div>
            `);
            return;
        }
        next(error);
    }
};

/**
 * POST /api/contact
 * Body: { name, email, message }
 */
export const handleContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, email, message } = req.body;

        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            res.status(400).json({
                status:  'error',
                message: 'Name, email, and message are all required.',
            });
            return;
        }

        await saveContactMessage(name.trim(), email.trim().toLowerCase(), message.trim());

        res.status(201).json({
            status:  'success',
            message: 'Your message has been received. We will be in touch shortly.',
        });
    } catch (error) {
        logger.error('handleContact', error);
        next(error);
    }
};

/**
 * GET /api/admin/subscribers
 * Returns all subscribers, newest first.
 */
export const listSubscribers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const subscribers = await getAllSubscribers();

        res.status(200).json({
            status: 'success',
            data:   { total: subscribers.length, subscribers },
        });
    } catch (error) {
        logger.error('listSubscribers', error);
        next(error);
    }
};

/**
 * GET /api/admin/contact-messages?read=true|false
 * Returns all contact messages. Optionally filter by read status.
 */
export const listContactMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const readFilter = req.query.read as 'true' | 'false' | undefined;
        const messages   = await getAllContactMessages(readFilter);

        res.status(200).json({
            status: 'success',
            data:   { total: messages.length, messages },
        });
    } catch (error) {
        logger.error('listContactMessages', error);
        next(error);
    }
};

/**
 * PATCH /api/admin/contact-messages/:id/read
 * Marks a single message as read.
 */
export const markContactMessageRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const message = await markMessageRead(id(req.params.id));

        res.status(200).json({
            status:  'success',
            message: 'Message marked as read.',
            data:    message,
        });
    } catch (error) {
        logger.error('markContactMessageRead', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};