import { Schema, model, Document } from 'mongoose';

export interface IContactMessage extends Document {
    name:      string;
    email:     string;
    message:   string;
    read:      boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
    {
        name: {
            type:      String,
            required:  true,
            trim:      true,
            maxlength: 100,
        },
        email: {
            type:      String,
            required:  true,
            trim:      true,
            lowercase: true,
            match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
        },
        message: {
            type:      String,
            required:  true,
            trim:      true,
            maxlength: 2000,
        },
        read: {
            type:    Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ read: 1, createdAt: -1 });

export const ContactMessage = model<IContactMessage>('ContactMessage', ContactMessageSchema);