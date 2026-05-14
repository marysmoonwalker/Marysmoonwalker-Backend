import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import 'dotenv/config';

import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import forumRouter from './routes/forum.routes';
import analyticsRoutes from './routes/analytics.routes';
import { errorHandler } from './middlewares/error.middleware';
import { connectDB } from './config/db';

const app: Application = express();

const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3001',
];

app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: Origin ${origin} is not allowed.`));
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/** Ensures DB is connected before handling any request. Reuses existing connection on warm invocations. */
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }
    next();
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'success', message: 'Server is up and running.' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', postRoutes);
app.use('/api/v1/forum', forumRouter);
app.use('/api/v1', analyticsRoutes);

app.use(errorHandler);

export default app;