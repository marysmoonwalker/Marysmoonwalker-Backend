import { Schema, model, Document } from 'mongoose';

export interface IBlacklistedToken extends Document {
    token: string;
    expiresAt: Date;
}

const BlacklistedTokenSchema = new Schema<IBlacklistedToken>({
    token:     { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
});

BlacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const BlacklistedToken = model<IBlacklistedToken>('BlacklistedToken', BlacklistedTokenSchema);