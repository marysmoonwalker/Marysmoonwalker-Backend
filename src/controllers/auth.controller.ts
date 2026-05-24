import { Request, Response, NextFunction } from 'express';
import {
    registerUser,
    verifyEmail,
    resendVerificationOtp,
    loginUser,
    refreshAccessToken,
    logoutUser,
    forgotPassword,
    resetPassword,
    updatePassword,
    updateUserProfile,
    findUserById,
    deleteUserAccount,
} from '../services/auth.service';

// Timestamp logger used in every catch block so you can see exactly
// when and which controller action threw an error.
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

/** Handles new user registration and sends a verification OTP to their email. */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const forwarded = req.headers['x-forwarded-for'];
        const ip        = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim()) ?? req.ip ?? '';

        const user = await registerUser(req.body, req.file, ip);

        res.status(201).json({
            status: 'success',
            message: 'Registration successful. Please check your email for your verification OTP.',
            data: {
                id:       user._id,
                fullName: user.fullName,
                email:    user.email,
            },
        });
    } catch (error) {
        logger.error('register', error);
        next(error);
    }
};

/** Verifies a user's email address using the OTP sent during registration. */
export const verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, otp } = req.body;
        const user = await verifyEmail(email, otp);
        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully. You can now log in.',
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        logger.error('verify', error);
        next(error);
    }
};

/** Resends a fresh OTP to the user's email if their previous one expired. */
export const resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;
        await resendVerificationOtp(email);
        res.status(200).json({
            status: 'success',
            message: 'A new OTP has been sent to your email.',
        });
    } catch (error) {
        logger.error('resendOtp', error);
        next(error);
    }
};

/** Authenticates a user and returns access and refresh tokens. */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        const ip = req.ip;
        const ua = req.headers['user-agent'];

        const { accessToken, refreshToken, user } = await loginUser(email, password, ip, ua);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            status: 'success',
            message: 'Login successful.',
            data: {
                accessToken,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    username: user.username,
                    avatar: user.avatar,
                    role: user.role,
                    isVerified: user.isVerified,
                },
            },
        });
    } catch (error) {
        logger.error('login', error);
        next(error);
    }
};

/** Issues a new access token using the refresh token stored in the cookie. */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ status: 'error', message: 'No refresh token provided.' });
            return;
        }

        const { accessToken, user } = await refreshAccessToken(refreshToken);

        res.status(200).json({
            status: 'success',
            message: 'Access token refreshed.',
            data: {
                accessToken,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        logger.error('refresh', error);
        next(error);
    }
};

/** Logs out a user by blacklisting the access token and clearing the refresh token cookie. */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1]!;
        await logoutUser(req.user!.id, accessToken);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.status(200).json({
            status: 'success',
            message: 'Logged out successfully.',
        });
    } catch (error) {
        logger.error('logout', error);
        next(error);
    }
};

/** Sends a password reset OTP to the user's email address. */
export const forgotPasswordRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;
        await forgotPassword(email);
        res.status(200).json({
            status: 'success',
            message: 'A password reset OTP has been sent to your email.',
        });
    } catch (error) {
        logger.error('forgotPasswordRequest', error);
        next(error);
    }
};

/** Resets a user's password after validating the OTP sent to their email. */
export const resetPasswordRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, otp, newPassword } = req.body;
        await resetPassword(email, otp, newPassword);
        res.status(200).json({
            status: 'success',
            message: 'Password reset successful. You can now log in with your new password.',
        });
    } catch (error) {
        logger.error('resetPasswordRequest', error);
        next(error);
    }
};

/** Updates the password for an already authenticated user. */
export const updatePasswordRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;
        await updatePassword(req.user!.id, currentPassword, newPassword);
        res.status(200).json({
            status: 'success',
            message: 'Password updated successfully. Please log in again.',
        });
    } catch (error) {
        logger.error('updatePasswordRequest', error);
        next(error);
    }
};

/** Updates the profile information of the currently authenticated user. */
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const updatedUser = await updateUserProfile(req.user!.id, req.body, req.file);
        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully.',
            data: updatedUser,
        });
    } catch (error) {
        logger.error('updateProfile', error);
        next(error);
    }
};

/** Retrieves the profile of the currently authenticated user. */
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await findUserById(req.user!.id);
        res.status(200).json({
            status: 'success',
            data: user,
        });
    } catch (error) {
        logger.error('getProfile', error);
        next(error);
    }
};

/** Permanently deletes the account of the currently authenticated user. */
export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await deleteUserAccount(req.user!.id);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.status(200).json({
            status: 'success',
            message: 'Account deleted successfully.',
        });
    } catch (error) {
        logger.error('deleteAccount', error);
        next(error);
    }
};