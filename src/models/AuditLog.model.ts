import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
    userId: Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}

const AuditLogSchema = new Schema<IAuditLog>({
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action:    { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata:  { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

AuditLogSchema.index({ userId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);