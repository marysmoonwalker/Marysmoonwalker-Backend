import { Types } from 'mongoose';
import { Post, PostView } from '../models/Post.model';
import { User } from '../models/User.model';
import { ForumThread, ForumReply } from '../models/Forum.model';
import { deleteFromCloudinary } from '../utils/cloudinaryUpload';
import { AuditLog } from '../models/AuditLog.model';

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

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Resolves a named period into a start Date for aggregation range filters.
 * daily = last 24 h, weekly = last 7 d, monthly = last 30 d, yearly = last 365 d.
 */
const resolvePeriodStart = (period: Period): Date => {
    const ms =
        period === 'daily'   ? 24  * 60 * 60 * 1000 :
        period === 'weekly'  ? 7   * 24 * 60 * 60 * 1000 :
        period === 'monthly' ? 30  * 24 * 60 * 60 * 1000 :
                               365 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() - ms);
};

/**
 * Returns the MongoDB $dateToString format for a given period granularity.
 * daily and weekly bucket by day, monthly buckets by month, yearly buckets by year.
 */
const dateFormat = (period: Period): string =>
    period === 'yearly'  ? '%Y'    :
    period === 'monthly' ? '%Y-%m' :
                           '%Y-%m-%d';

/**
 * Returns platform-wide totals used for the analytics KPI cards:
 * total posts, published posts, draft posts, all-time views,
 * total registered users, verified users, forum threads, and forum replies.
 */
export const getOverview = async () => {
    const [
        totalPosts,
        totalPublished,
        totalDrafts,
        totalViews,
        totalUsers,
        totalVerifiedUsers,
        totalForumThreads,
        totalForumReplies,
    ] = await Promise.all([
        Post.countDocuments(),
        Post.countDocuments({ status: 'published' }),
        Post.countDocuments({ status: 'draft' }),
        PostView.countDocuments(),
        User.countDocuments(),
        User.countDocuments({ isVerified: true }),
        ForumThread.countDocuments({ isDeleted: false }),
        ForumReply.countDocuments({ isDeleted: false }),
    ]);

    logger.info('getOverview', 'Platform overview fetched');

    return {
        totalPosts,
        totalPublished,
        totalDrafts,
        totalViews,
        totalUsers,
        totalVerifiedUsers,
        totalForumThreads,
        totalForumReplies,
    };
};

/**
 * Returns view counts bucketed by the requested period for the traffic chart.
 * Each bucket includes a total views count plus a split between logged-in visitors
 * (userId present) and guest visitors (userId is null).
 */
export const getViewsChart = async (period: Period = 'daily') => {
    const since  = resolvePeriodStart(period);
    const format = dateFormat(period);

    const [allViews, loggedInViews] = await Promise.all([
        PostView.aggregate([
            { $match:   { viewedAt: { $gte: since } } },
            { $group:   { _id: { $dateToString: { format, date: '$viewedAt' } }, views: { $sum: 1 } } },
            { $sort:    { _id: 1 } },
            { $project: { _id: 0, date: '$_id', views: 1 } },
        ]),
        PostView.aggregate([
            { $match:   { viewedAt: { $gte: since }, userId: { $ne: null } } },
            { $group:   { _id: { $dateToString: { format, date: '$viewedAt' } }, views: { $sum: 1 } } },
            { $sort:    { _id: 1 } },
            { $project: { _id: 0, date: '$_id', views: 1 } },
        ]),
    ]);

    const loggedInMap: Record<string, number> = {};
    for (const row of loggedInViews) {
        loggedInMap[row.date] = row.views;
    }

    const data = allViews.map(row => ({
        date:     row.date,
        total:    row.views,
        loggedIn: loggedInMap[row.date] ?? 0,
        guests:   row.views - (loggedInMap[row.date] ?? 0),
    }));

    logger.info('getViewsChart', `Views chart fetched | period: ${period}`);

    return { period, data };
};

/**
 * Returns new user registrations bucketed by the requested period.
 * Each bucket includes total registrations plus a split between
 * verified and unverified accounts so growth quality can be assessed.
 */
export const getUserGrowth = async (period: Period = 'daily') => {
    const since  = resolvePeriodStart(period);
    const format = dateFormat(period);

    const [allRegistrations, verifiedRegistrations] = await Promise.all([
        User.aggregate([
            { $match:   { createdAt: { $gte: since } } },
            { $group:   { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort:    { _id: 1 } },
            { $project: { _id: 0, date: '$_id', count: 1 } },
        ]),
        User.aggregate([
            { $match:   { createdAt: { $gte: since }, isVerified: true } },
            { $group:   { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort:    { _id: 1 } },
            { $project: { _id: 0, date: '$_id', count: 1 } },
        ]),
    ]);

    const verifiedMap: Record<string, number> = {};
    for (const row of verifiedRegistrations) {
        verifiedMap[row.date] = row.count;
    }

    const data = allRegistrations.map(row => ({
        date:       row.date,
        total:      row.count,
        verified:   verifiedMap[row.date] ?? 0,
        unverified: row.count - (verifiedMap[row.date] ?? 0),
    }));

    logger.info('getUserGrowth', `User growth chart fetched | period: ${period}`);

    return { period, data };
};

/**
 * Returns the number of posts grouped by content type (article, video, audio)
 * and by publication status (published, draft) for the content breakdown charts.
 */
export const getContentBreakdown = async () => {
    const [byType, byStatus] = await Promise.all([
        Post.aggregate([
            { $group:   { _id: '$type', count: { $sum: 1 } } },
            { $project: { _id: 0, type: '$_id', count: 1 } },
            { $sort:    { count: -1 } },
        ]),
        Post.aggregate([
            { $group:   { _id: '$status', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
        ]),
    ]);

    logger.info('getContentBreakdown', 'Content breakdown fetched');

    return { byType, byStatus };
};

/**
 * Returns the top 10 published posts ranked by total view count.
 * Each result includes the post title, slug, thumbnail, content type,
 * trending score, and the aggregated view count from the PostView collection.
 */
export const getTopPosts = async () => {
    const data = await PostView.aggregate([
        { $group:  { _id: '$postId', views: { $sum: 1 } } },
        { $sort:   { views: -1 } },
        { $limit:  10 },
        {
            $lookup: {
                from:         'posts',
                localField:   '_id',
                foreignField: '_id',
                as:           'post',
            },
        },
        { $unwind: '$post' },
        { $match:  { 'post.status': 'published' } },
        {
            $project: {
                _id:           '$post._id',
                title:         '$post.title',
                slug:          '$post.slug',
                thumbnail:     '$post.thumbnail',
                type:          '$post.type',
                trendingScore: '$post.trendingScore',
                views:         1,
            },
        },
    ]);

    logger.info('getTopPosts', `Top ${data.length} posts fetched`);

    return data;
};

/**
 * Returns forum activity analytics: threads and replies created over the requested
 * period bucketed by date, plus a breakdown of thread counts by forum category.
 */
export const getForumStats = async (period: Period = 'daily') => {
    const since  = resolvePeriodStart(period);
    const format = dateFormat(period);

    const [threadsOverTime, repliesOverTime, byCategory] = await Promise.all([
        ForumThread.aggregate([
            { $match:   { isDeleted: false, createdAt: { $gte: since } } },
            { $group:   { _id: { $dateToString: { format, date: '$createdAt' } }, threads: { $sum: 1 } } },
            { $sort:    { _id: 1 } },
            { $project: { _id: 0, date: '$_id', threads: 1 } },
        ]),
        ForumReply.aggregate([
            { $match:   { isDeleted: false, createdAt: { $gte: since } } },
            { $group:   { _id: { $dateToString: { format, date: '$createdAt' } }, replies: { $sum: 1 } } },
            { $sort:    { _id: 1 } },
            { $project: { _id: 0, date: '$_id', replies: 1 } },
        ]),
        ForumThread.aggregate([
            { $match:   { isDeleted: false } },
            { $group:   { _id: '$category', count: { $sum: 1 } } },
            { $sort:    { count: -1 } },
            { $project: { _id: 0, category: '$_id', count: 1 } },
        ]),
    ]);

    const repliesMap: Record<string, number> = {};
    for (const row of repliesOverTime) {
        repliesMap[row.date] = row.replies;
    }

    const activity = threadsOverTime.map(row => ({
        date:    row.date,
        threads: row.threads,
        replies: repliesMap[row.date] ?? 0,
    }));

    logger.info('getForumStats', `Forum stats fetched | period: ${period}`);

    return { period, activity, byCategory };
};

/**
 * Returns a paginated list of all registered users with their full details and
 * registration date. Supports search by full name, username, or email and
 * filtering by role (user | admin) and verification status.
 */
interface UserListItem {
    _id:             unknown;
    fullName:        string;
    username:        string;
    email:           string;
    avatar:          string;
    avatarPublicId?: string | null;
    role:            'user' | 'admin';
    bio?:            string;
    isVerified:      boolean;
    createdAt:       Date;
    updatedAt:       Date;
}

interface UserListResult {
    users:      UserListItem[];
    pagination: {
        total:      number;
        page:       number;
        limit:      number;
        totalPages: number;
        hasMore:    boolean;
    };
}

export const getAllUsers = async (
    page:        number   = 1,
    limit:       number   = 20,
    search?:     string,
    role?:       'user' | 'admin',
    isVerified?: boolean,
): Promise<UserListResult> => {
    const query: Record<string, unknown> = {};

    if (search?.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ fullName: regex }, { email: regex }, { username: regex }];
    }

    if (role)                     query.role       = role;
    if (isVerified !== undefined) query.isVerified = isVerified;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password -refreshToken -otpCode -otpExpires -passwordResetOtp -passwordResetExpires')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean() as unknown as UserListItem[],
        User.countDocuments(query),
    ]);

    logger.info('getAllUsers', `Fetched ${users.length} of ${total} users | page: ${page}`);

    return {
        users,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore:    page * limit < total,
        },
    };
};

/**
 * Permanently deletes a user account by ID and removes their Cloudinary avatar.
 * Only callable by an admin. The deletion is logged to the audit trail.
 */
export const adminDeleteUser = async (adminId: string, targetUserId: string) => {
    const user = await User.findById(targetUserId);
    if (!user) throw new Error('User not found');

    if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);

    await User.findByIdAndDelete(targetUserId);

    await AuditLog.create({
        userId:   adminId,
        action:   'ADMIN_USER_DELETED',
        metadata: { deletedUserId: targetUserId, email: user.email },
    });

    logger.info('adminDeleteUser', `User ${user.email} (ID: ${targetUserId}) deleted by admin ID: ${adminId}`);
};

/**
 * Updates the role of any user account between user and admin.
 * Only callable by an admin. The role change is logged to the audit trail
 * and the updated user document is returned.
 */
export const adminUpdateUserRole = async (
    adminId:      string,
    targetUserId: string,
    newRole:      'user' | 'admin',
) => {
    const user = await User.findById(targetUserId);
    if (!user) throw new Error('User not found');

    const previousRole = user.role;
    user.role          = newRole;
    await user.save();

    await AuditLog.create({
        userId:   adminId,
        action:   'ADMIN_USER_ROLE_UPDATED',
        metadata: { targetUserId, previousRole, newRole },
    });

    logger.info('adminUpdateUserRole', `User ${targetUserId} role changed from ${previousRole} to ${newRole} by admin ID: ${adminId}`);

    return user;
};