import { Schema, model, Document } from 'mongoose';

export interface IVisitor extends Document {
    country:   string;
    date:      string;
    hits:      number;
    uniqueIps: string[];
}

const VisitorSchema = new Schema<IVisitor>({
    country:   { type: String, required: true },
    date:      { type: String, required: true },
    hits:      { type: Number, default: 0 },
    uniqueIps: { type: [String], default: [] },
});

VisitorSchema.index({ country: 1, date: 1 }, { unique: true });

export const Visitor = model<IVisitor>('Visitor', VisitorSchema);