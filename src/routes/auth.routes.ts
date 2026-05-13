import { Router } from 'express';
import {
    register,
    verify,
    resendOtp,
    login,
    refresh,
    logout,
    forgotPasswordRequest,
    resetPasswordRequest,
    updatePasswordRequest,
    updateProfile,
    getProfile,
    deleteAccount,
} from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { upload } from '../utils/multer';
import { authLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/register',         authLimiter, upload.single('avatar'), register);
router.post('/verify-email',     authLimiter, verify);
router.post('/resend-otp',       authLimiter, resendOtp);
router.post('/login',            authLimiter, login);
router.post('/refresh-token',    refresh);
router.post('/logout',           protect, logout);
router.post('/forgot-password',  authLimiter, forgotPasswordRequest);
router.post('/reset-password',   authLimiter, resetPasswordRequest);

router.get('/me',                protect, getProfile);
router.patch('/update-password', protect, updatePasswordRequest);
router.patch('/update-profile',  protect, upload.single('avatar'), updateProfile);
router.delete('/delete-account', protect, deleteAccount);

export default router;