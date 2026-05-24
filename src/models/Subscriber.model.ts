import { Schema, model, Document } from 'mongoose';
import crypto                       from 'crypto';

export interface ISubscriber extends Document {
    email:            string;
    unsubscribeToken: string;
    createdAt:        Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
    {
        email: {
            type:      String,
            required:  true,
            unique:    true,
            trim:      true,
            lowercase: true,
            match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
        },
        unsubscribeToken: {
            type:    String,
            default: () => crypto.randomBytes(32).toString('hex'),
            unique:  true,
        },
    },
    { timestamps: true },
);

export const Subscriber = model<ISubscriber>('Subscriber', SubscriberSchema);