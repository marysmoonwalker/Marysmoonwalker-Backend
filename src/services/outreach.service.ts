import { Subscriber, ISubscriber } from '../models/Subscriber.model';
import { ContactMessage, IContactMessage } from '../models/ContactMessage.model';
import { sendEmail } from '../utils/sendEmail';
import {
    subscribeConfirmTemplate,
    contactAcknowledgementTemplate,
} from '../templates/outreach.emailTemplates';

const logger = {
    info: (context: string, message: string) => {
        console.log(`[${new Date().toISOString()}] [INFO] [${context}]: ${message}`);
    },
    warn: (context: string, message: string) => {
        console.warn(`[${new Date().toISOString()}] [WARN] [${context}]: ${message}`);
    },
    error: (context: string, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const stack   = error instanceof Error ? error.stack   : undefined;
        console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
        if (stack) console.error(stack);
    },
};

/**
 * Creates a new subscriber.
 * Fires a confirmation email after saving — email failure does NOT
 * roll back the subscription; it is logged and swallowed.
 * Throws a 409-tagged error if the email is already registered.
 */
export const subscribe = async (email: string): Promise<ISubscriber> => {
    const existing = await Subscriber.findOne({ email });

    if (existing) {
        const err = new Error('This email is already subscribed.');
        (err as any).status = 409;
        throw err;
    }

    const subscriber = await Subscriber.create({ email });

    logger.info('subscribe', `New subscriber saved: ${email}`);

    // Fire-and-forget — email failure must not block the response
    try {
        await sendEmail({
            email,
            subject: 'Welcome to Mary\'s Moonwalker 🎤',
            html:    subscribeConfirmTemplate(subscriber.unsubscribeToken),
        });
    } catch (emailError) {
        logger.warn('subscribe', `Subscriber saved but confirmation email failed for ${email}`);
        logger.error('subscribe:email', emailError);
    }

    return subscriber;
};

/**
 * Removes a subscriber by their unique unsubscribe token.
 * Throws a 404-tagged error if the token is not found.
 */
export const unsubscribe = async (token: string): Promise<void> => {
    const subscriber = await Subscriber.findOneAndDelete({ unsubscribeToken: token });

    if (!subscriber) {
        const err = new Error('Unsubscribe link is invalid or has already been used.');
        (err as any).status = 404;
        throw err;
    }

    logger.info('unsubscribe', `Subscriber removed: ${subscriber.email}`);
};

/**
 * Persists an inbound contact message.
 * Sends an auto-reply acknowledgement — email failure does NOT
 * block the save; it is logged and swallowed.
 */
export const saveContactMessage = async (
    name:    string,
    email:   string,
    message: string,
): Promise<IContactMessage> => {
    const entry = await ContactMessage.create({ name, email, message });

    logger.info('saveContactMessage', `Contact message saved from ${email}`);

    // Fire-and-forget acknowledgement
    try {
        await sendEmail({
            email,
            subject: 'We received your message — Mary\'s Moonwalker',
            html:    contactAcknowledgementTemplate(name),
        });
    } catch (emailError) {
        logger.warn('saveContactMessage', `Message saved but acknowledgement email failed for ${email}`);
        logger.error('saveContactMessage:email', emailError);
    }

    return entry;
};

/** Returns all subscribers, newest first. */
export const getAllSubscribers = async (): Promise<ISubscriber[]> => {
    return Subscriber.find().sort({ createdAt: -1 }).lean<ISubscriber[]>();
};

/**
 * Returns all contact messages, newest first.
 * Accepts an optional `read` filter ('true' | 'false' | undefined).
 */
export const getAllContactMessages = async (
    readFilter?: 'true' | 'false',
): Promise<IContactMessage[]> => {
    const query: Record<string, unknown> = {};

    if (readFilter === 'true')  query.read = true;
    if (readFilter === 'false') query.read = false;

    return ContactMessage.find(query).sort({ createdAt: -1 }).lean<IContactMessage[]>();
};

/** Marks a single contact message as read. */
export const markMessageRead = async (messageId: string): Promise<IContactMessage> => {
    const message = await ContactMessage.findByIdAndUpdate(
        messageId,
        { read: true },
        { new: true },
    );

    if (!message) {
        const err = new Error('Message not found.');
        (err as any).status = 404;
        throw err;
    }

    logger.info('markMessageRead', `Message ${messageId} marked as read`);
    return message;
};