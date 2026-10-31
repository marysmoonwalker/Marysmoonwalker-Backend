import jwt from 'jsonwebtoken';

export const generateAccessToken = (id: string, role: string): string => {
    const expiresIn = role === 'admin' ? '8h' : '4h';
    return jwt.sign({ id, role }, process.env.JWT_SECRET!, { expiresIn });
};

export const generateRefreshToken = (id: string): string => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
};