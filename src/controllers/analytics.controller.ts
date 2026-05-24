import { Request, Response, NextFunction } from 'express';
import {
    getOverview,
    getViewsChart,
    getUserGrowth,
    getContentBreakdown,
    getTopPosts,
    getForumStats,
    getAllUsers,
    adminDeleteUser,
    adminUpdateUserRole,
    getVisitorStats,
    getVisitorsByCountry,
    getUsersByCountry,
} from '../services/analytics.service';

/**
 * Centralised timestamp logger so every error/info line shows when it happened.
 */
const logger = {
    error: (context: string, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
    },
};

/**
 * Returns platform-wide KPI totals: posts, published, drafts, views,
 * users, verified users, forum threads, and forum replies.
 */
export const fetchOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await getOverview();
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchOverview', error);
        next(error);
    }
};

/**
 * Returns view counts bucketed by the requested period for the traffic chart.
 * Accepts an optional query param: period = daily | weekly | monthly | yearly.
 * Defaults to daily if not provided.
 */
export const fetchViewsChart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const period = (Array.isArray(req.query.period) ? req.query.period[0] : req.query.period) as 'daily' | 'weekly' | 'monthly' | 'yearly' || 'daily';
        const data   = await getViewsChart(period);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchViewsChart', error);
        next(error);
    }
};

/**
 * Returns new user registrations bucketed by the requested period.
 * Accepts an optional query param: period = daily | weekly | monthly | yearly.
 * Defaults to daily if not provided.
 */
export const fetchUserGrowth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const period = (Array.isArray(req.query.period) ? req.query.period[0] : req.query.period) as 'daily' | 'weekly' | 'monthly' | 'yearly' || 'daily';
        const data   = await getUserGrowth(period);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchUserGrowth', error);
        next(error);
    }
};

/**
 * Returns the number of posts grouped by content type and publication status
 * for the content breakdown donut and bar charts.
 */
export const fetchContentBreakdown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await getContentBreakdown();
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchContentBreakdown', error);
        next(error);
    }
};

/**
 * Returns the top 10 published posts ranked by total view count,
 * including title, slug, thumbnail, type, trending score, and views.
 */
export const fetchTopPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await getTopPosts();
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchTopPosts', error);
        next(error);
    }
};

/**
 * Returns forum activity analytics bucketed by the requested period,
 * plus a breakdown of thread counts by forum category.
 * Accepts an optional query param: period = daily | weekly | monthly | yearly.
 * Defaults to daily if not provided.
 */
export const fetchForumStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const period = (Array.isArray(req.query.period) ? req.query.period[0] : req.query.period) as 'daily' | 'weekly' | 'monthly' | 'yearly' || 'daily';
        const data   = await getForumStats(period);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchForumStats', error);
        next(error);
    }
};

/**
 * Returns a paginated list of all registered users with their details and
 * registration date. Accepts optional query params: page, limit, search,
 * role (user | admin), and isVerified (true | false).
 */
export const fetchAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page       = parseInt(Array.isArray(req.query.page)  ? (req.query.page[0]  as string) : (req.query.page  as string)) || 1;
        const limit      = parseInt(Array.isArray(req.query.limit) ? (req.query.limit[0] as string) : (req.query.limit as string)) || 20;
        const search     = (Array.isArray(req.query.search)     ? req.query.search[0]     : req.query.search)     as string | undefined;
        const role       = (Array.isArray(req.query.role)       ? req.query.role[0]       : req.query.role)       as 'user' | 'admin' | undefined;
        const rawVerified = Array.isArray(req.query.isVerified) ? req.query.isVerified[0] : req.query.isVerified;
        const isVerified  = rawVerified !== undefined ? rawVerified === 'true' : undefined;

        const data = await getAllUsers(page, limit, search, role, isVerified);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchAllUsers', error);
        next(error);
    }
};

/**
 * Permanently deletes a user account by ID. Only callable by an admin.
 * Expects the target user ID as a URL param: /admin/users/:id.
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const adminId      = (req as any).user.id;
        const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        await adminDeleteUser(adminId, targetUserId);
        res.status(200).json({ status: 'success', message: 'User account permanently deleted' });
    } catch (error) {
        logger.error('deleteUser', error);
        next(error);
    }
};

/**
 * Updates the role of a user account between user and admin.
 * Only callable by an admin. Expects the target user ID as a URL param
 * and the new role in the request body: { role: 'user' | 'admin' }.
 */
export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const adminId      = (req as any).user.id;
        const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { role }     = req.body as { role: 'user' | 'admin' };

        if (!role || !['user', 'admin'].includes(role)) {
            res.status(400).json({ status: 'fail', message: 'Role must be either user or admin' });
            return;
        }

        const updatedUser = await adminUpdateUserRole(adminId, targetUserId, role);
        res.status(200).json({ status: 'success', data: updatedUser });
    } catch (error) {
        logger.error('updateUserRole', error);
        next(error);
    }
};

/**
 * Returns total hits and unique visitor counts bucketed by the requested period.
 * Accepts an optional query param: period = daily | weekly | monthly | yearly.
 * Defaults to daily if not provided.
 */
export const fetchVisitorStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const period = (Array.isArray(req.query.period) ? req.query.period[0] : req.query.period) as 'daily' | 'weekly' | 'monthly' | 'yearly' || 'daily';
        const data   = await getVisitorStats(period);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchVisitorStats', error);
        next(error);
    }
};

/**
 * Returns visitor counts grouped by country for the requested period.
 * Accepts an optional query param: period = daily | weekly | monthly | yearly.
 * Defaults to monthly if not provided.
 */
export const fetchVisitorsByCountry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const period = (Array.isArray(req.query.period) ? req.query.period[0] : req.query.period) as 'daily' | 'weekly' | 'monthly' | 'yearly' || 'monthly';
        const data   = await getVisitorsByCountry(period);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchVisitorsByCountry', error);
        next(error);
    }
};

/**
 * Returns registered user counts grouped by country.
 * No period filter — returns all-time totals per country.
 */
export const fetchUsersByCountry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await getUsersByCountry();
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        logger.error('fetchUsersByCountry', error);
        next(error);
    }
};