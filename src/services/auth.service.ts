import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/User.model';
import { AuditLog } from '../models/AuditLog.model';
import { BlacklistedToken } from '../models/BlacklistedToken.model';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload';
import { sendEmail } from '../utils/sendEmail';
import { resolveLocation } from '../utils/resolveLocation';
import { welcomeEmailTemplate, otpEmailTemplate, passwordResetOtpTemplate } from '../templates/auth.templates';

/**
 * Centralised timestamp logger so every error/info line shows when it happened.
 */
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
 * Generate OTP function code.
 */
const generateOtp = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash the OTP code.
 */
const hashOtp = (otp: string): string => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Password strength validator.
 * Enforces: minimum 8 characters, at least one uppercase letter,
 * at least one number, and at least one special character.
 */
const validatePasswordStrength = (password: string): void => {
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter.');
    }
    if (!/[0-9]/.test(password)) {
        throw new Error('Password must contain at least one number.');
    }
    if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(password)) {
        throw new Error('Password must contain at least one special character (e.g. !@#$%^&*).');
    }
};

/** Generates a unique username from the user's first name and a 4-digit random suffix. "Okpala Emmanuel" → "okpala-2635" */
const generateUsername = async (fullName: string): Promise<string> => {
    const firstName = fullName.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
 
    let username = '';
    let isUnique = false;
 
    while (!isUnique) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        username = `${firstName}-${suffix}`;
        const existing = await User.findOne({ username });
        if (!existing) isUnique = true;
    }
 
    return username;
};
 
/** Generates a DiceBear avatar URL seeded from the username, giving every user a unique default avatar. */
const generateDefaultAvatar = (username: string): string => {
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(username)}`;
};

/** Registers a new user, auto-generates their username and default avatar, and sends a 6-digit OTP to their email for verification. */
export const registerUser = async (userData: Partial<IUser>, file?: Express.Multer.File, ip?: string) => {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) throw new Error('Email already in use');

    validatePasswordStrength(userData.password!);

    const username          = await generateUsername(userData.fullName!);
    const avatarUrl         = file ? await uploadToCloudinary(file.buffer) : generateDefaultAvatar(username);
    const { country, city } = resolveLocation(ip ?? '');

    const hashedPassword = await bcrypt.hash(userData.password!, 12);
    const otp            = generateOtp();
    const hashedOtp      = hashOtp(otp);

    const newUser = await User.create({
        ...userData,
        username,
        password:        hashedPassword,
        avatar:          avatarUrl,
        country,
        city,
        registrationIp:  ip ?? null,
        otpCode:         hashedOtp,
        otpExpires:      new Date(Date.now() + 10 * 60 * 1000),
    });

    logger.info('registerUser', `New user registered: ${newUser.email} | username: ${newUser.username} | country: ${country}`);

    try {
        await sendEmail({
            email:   newUser.email,
            subject: 'Marys Moonwalker - Your Verification OTP',
            html:    otpEmailTemplate(newUser.fullName, otp),
        });
        logger.info('registerUser', `Verification OTP email sent to ${newUser.email}`);
    } catch (emailError) {
        logger.error('registerUser:sendEmail', emailError);
    }

    return newUser;
};

/** Verifies a user's email address using the 6-digit OTP sent during registration. */
export const verifyEmail = async (email: string, otp: string) => {
    const user = await User.findOne({ email }).select('+otpCode +otpExpires');
    if (!user) throw new Error('No account found with that email');

    if (user.isVerified) throw new Error('Email is already verified');

    if (!user.otpCode || !user.otpExpires) throw new Error('OTP not found, please request a new one');

    if (user.otpExpires < new Date()) throw new Error('OTP has expired, please request a new one');

    const hashedOtp = hashOtp(otp);
    if (hashedOtp !== user.otpCode) throw new Error('Invalid OTP');

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    logger.info('verifyEmail', `Email verified for user: ${email}`);

    try {
        await sendEmail({
            email: user.email,
            subject: 'Welcome to Marys Moonwalker',
            html: welcomeEmailTemplate(user.fullName),
        });
        logger.info('verifyEmail', `Welcome email sent to ${user.email}`);
    } catch (emailError) {
        logger.error('verifyEmail:sendEmail', emailError);
    }

    return user;
};

/** Resends a fresh OTP to the user's email if their previous OTP expired. */
export const resendVerificationOtp = async (email: string) => {
    const user = await User.findOne({ email }).select('+otpCode +otpExpires');
    if (!user) throw new Error('No account found with that email');

    if (user.isVerified) throw new Error('Email is already verified');

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    user.otpCode = hashedOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    logger.info('resendVerificationOtp', `New OTP generated for ${email}`);

    try {
        await sendEmail({
            email: user.email,
            subject: 'Marys Moonwalker - Your New Verification OTP',
            html: otpEmailTemplate(user.fullName, otp),
        });
        logger.info('resendVerificationOtp', `New OTP email sent to ${email}`);
    } catch (emailError) {
        logger.error('resendVerificationOtp:sendEmail', emailError);

        throw new Error('Failed to send OTP email. Please try again shortly.');
    }
};

/** Authenticates a user, returns access and refresh tokens, and logs the login event. */
export const loginUser = async (email: string, password: string, ip?: string, ua?: string) => {
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new Error('Invalid credentials');

    if (!user.isVerified) throw new Error('Please verify your email before logging in');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    const accessToken  = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshToken = hashedRefreshToken;
    await user.save();

    await AuditLog.create({
        userId: user._id,
        action: 'USER_LOGIN',
        ipAddress: ip,
        userAgent: ua,
    });

    logger.info('loginUser', `User logged in: ${email} from IP ${ip ?? 'unknown'}`);

    return { accessToken, refreshToken, user };
};

/** Issues a new access token using a valid refresh token. */
export const refreshAccessToken = async (refreshToken: string) => {
    if (!refreshToken) throw new Error('No refresh token provided');

    let decoded: { id: string };

    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
    } catch (err) {
        logger.error('refreshAccessToken:jwtVerify', err);
        throw new Error('Refresh token invalid or expired');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || !user.refreshToken) throw new Error('User not found or not logged in');

    const hashedIncoming = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (hashedIncoming !== user.refreshToken) throw new Error('Refresh token mismatch');

    const newAccessToken = generateAccessToken(user._id.toString(), user.role);

    logger.info('refreshAccessToken', `Access token refreshed for user ID: ${decoded.id}`);

    return { accessToken: newAccessToken, user };
};

/** Logs out a user by blacklisting the access token and clearing the refresh token. */
export const logoutUser = async (userId: string, accessToken: string) => {
    const decoded = jwt.decode(accessToken) as { exp: number } | null;

    if (decoded?.exp) {
        await BlacklistedToken.create({
            token: accessToken,
            expiresAt: new Date(decoded.exp * 1000),
        });
    }

    await User.findByIdAndUpdate(userId, { refreshToken: null });

    await AuditLog.create({
        userId,
        action: 'USER_LOGOUT',
    });

    logger.info('logoutUser', `User logged out: ID ${userId}`);
};

/** Sends a 6-digit OTP to the user's email to initiate a password reset. */
export const forgotPassword = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('No account found with that email');

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    user.passwordResetOtp     = hashedOtp;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    logger.info('forgotPassword', `Password reset OTP generated for ${email}`);

    try {
        await sendEmail({
            email: user.email,
            subject: 'Marys Moonwalker - Password Reset OTP',
            html: passwordResetOtpTemplate(user.fullName, otp),
        });
        logger.info('forgotPassword', `Password reset OTP email sent to ${email}`);
    } catch (emailError) {
        logger.error('forgotPassword:sendEmail', emailError);
        throw new Error('Failed to send password reset email. Please try again shortly.');
    }
};

/** Resets a user's password after validating the OTP sent to their email. */
export const resetPassword = async (email: string, otp: string, newPassword: string) => {
    const user = await User.findOne({ email }).select('+password +passwordResetOtp +passwordResetExpires');
    if (!user) throw new Error('No account found with that email');

    if (!user.passwordResetOtp || !user.passwordResetExpires) {
        throw new Error('OTP not found, please request a new one');
    }

    if (user.passwordResetExpires < new Date()) throw new Error('OTP has expired, please request a new one');

    const hashedOtp = hashOtp(otp);
    if (hashedOtp !== user.passwordResetOtp) throw new Error('Invalid OTP');

    validatePasswordStrength(newPassword);

    user.password             = await bcrypt.hash(newPassword, 12);
    user.passwordResetOtp     = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken         = null;
    await user.save();

    await AuditLog.create({
        userId: user._id,
        action: 'PASSWORD_RESET',
    });

    logger.info('resetPassword', `Password reset successful for ${email}`);

    return user;
};

/** Updates the password for an already authenticated user. */
export const updatePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Current password is incorrect');

    validatePasswordStrength(newPassword);

    user.password     = await bcrypt.hash(newPassword, 12);
    user.refreshToken = null;
    await user.save();

    await AuditLog.create({
        userId: user._id,
        action: 'PASSWORD_UPDATED',
    });

    logger.info('updatePassword', `Password updated for user ID: ${userId}`);

    return user;
};

/** Updates the profile information of an authenticated user. */
export const updateUserProfile = async (userId: string, updateData: Partial<IUser>, file?: Express.Multer.File) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (file) {
        if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);
        updateData.avatar = await uploadToCloudinary(file.buffer);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
    });

    logger.info('updateUserProfile', `Profile updated for user ID: ${userId}`);

    return updatedUser;
};

/** Retrieves a single user by their MongoDB ID. */
export const findUserById = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
};

/** Permanently deletes a user account and their avatar from Cloudinary. */
export const deleteUserAccount = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);

    await User.findByIdAndDelete(userId);

    await AuditLog.create({
        userId,
        action: 'ACCOUNT_DELETED',
    });

    logger.info('deleteUserAccount', `Account permanently deleted for user ID: ${userId}`);
};