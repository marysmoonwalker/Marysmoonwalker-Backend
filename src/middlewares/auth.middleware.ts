import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
    id: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const protect = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        next();
    } catch {
        res.status(401).json({ message: 'Token invalid or expired' });
    }
};

export const restrictTo = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!roles.includes(req.user?.role ?? '')) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        next();
    };
};