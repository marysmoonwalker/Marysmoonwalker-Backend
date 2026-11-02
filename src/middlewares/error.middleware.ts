import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    if (err.code === 11000 || (err.message && (err.message.includes('E11000') || err.message.includes('duplicate key')))) {
        statusCode = 409;
        const msgStr = err.message || '';
        const keyPattern = err.keyPattern || {};
        const keyValue = err.keyValue || {};

        if (keyPattern.username || keyValue.username || msgStr.includes('username')) {
            message = 'Username is already taken. Please choose another.';
        } else if (keyPattern.email || keyValue.email || msgStr.includes('email')) {
            message = 'Email is already registered. Please use another email.';
        } else {
            message = 'Duplicate entry detected. Please try another value.';
        }
    }

    res.status(statusCode).json({
        status: 'error',
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
