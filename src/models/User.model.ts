import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
    _id: Types.ObjectId;
    fullName: string;
    username: string;
    email: string;
    password: string;
    avatar: string;
    avatarPublicId?: string | null;
    role: 'user' | 'admin';
    bio?: string;
    isVerified: boolean;
    refreshToken?: string | null;
    otpCode?: string;
    otpExpires?: Date;
    passwordResetOtp?: string;
    passwordResetExpires?: Date;

    country?: string;
    city?: string;
    registrationIp?: string;
}

const UserSchema = new Schema<IUser>({
    fullName:             { type: String, required: true, trim: true },
    username:             { type: String, required: true, unique: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:             { type: String, required: true, select: false },
    avatar:               { type: String, default: 'https://res.cloudinary.com/default-avatar.png' },
    avatarPublicId:       { type: String, default: null },
    role:                 { type: String, enum: ['user', 'admin'], default: 'user' },
    bio:                  { type: String, maxlength: 250 },
    isVerified:           { type: Boolean, default: false },
    refreshToken:         { type: String, default: null, select: false },
    otpCode:              { type: String, select: false },
    otpExpires:           { type: Date, select: false },
    passwordResetOtp:     { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    country:         { type: String, default: 'Unknown' },
    city:            { type: String, default: 'Unknown' },
    registrationIp:  { type: String, default: null, select: false },
}, { timestamps: true });

export const User = model<IUser>('User', UserSchema);