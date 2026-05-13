import jwt from 'jsonwebtoken';

export const generateAccessToken = (id: string, role: string): string => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET!, { expiresIn: '15m' });
};

export const generateRefreshToken = (id: string): string => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
};