import { Types } from 'mongoose';
import { ForumThread, ForumReply, IForumThread, IForumReply } from '../models/Forum.model';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

/** Resolves a named period into a start Date for aggregation range filters. */
interface PopulatedAuthor {
    _id:      Types.ObjectId;
    fullName: string;
    username: string;
    avatar:   string;
}

export interface IUserActivity {
    _id: string;
    type: 'thread' | 'reply' | 'like';
    title: string;
    category: string;
    threadId: string;
    createdAt: string;
}

export interface PopulatedThread extends Omit<IForumThread, 'author'> {
    _id:         Types.ObjectId;
    author:      PopulatedAuthor;
    lastActive?: string;
}

export interface PopulatedReply extends Omit<IForumReply, 'author'> {
    _id:    Types.ObjectId;
    author: PopulatedAuthor;
}

interface CreateThreadInput {
    title:    string;
    body:     string;
    excerpt?: string;
    category: string;
    authorId: string;
}

interface GetThreadsQuery {
    category?: string;
    search?:   string;
    page?:     number;
    limit?:    number;
}

interface CreateReplyInput {
    threadId: string;
    authorId: string;
    body:     string;
    file?:    Express.Multer.File;
}

/** Creates a new forum thread. Excerpt auto-generated from body if not provided. */
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

/** Formats how long ago a date was, e.g. "2H AGO", "3D AGO" — matches the frontend display. */
const formatLastActive = (date: Date): string => {
    const diffMs      = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);
    const diffHours   = Math.floor(diffMinutes / 60);
    const diffDays    = Math.floor(diffHours / 24);

    if (diffMinutes < 60) return `${diffMinutes}M AGO`;
    if (diffHours   < 24) return `${diffHours}H AGO`;
    return `${diffDays}D AGO`;
};

/** Creates a new forum thread. Excerpt auto-generated from body if not provided. */
export const createThread = async (input: CreateThreadInput): Promise<PopulatedThread> => {
    const excerpt = input.excerpt?.trim() ||
        input.body.replace(/<[^>]*>?/gm, '').trim().slice(0, 200) + '...';

    const thread = await ForumThread.create({
        title:        input.title,
        body:         input.body,
        excerpt,
        category:     input.category,
        author:       input.authorId,
        lastActiveAt: new Date(),
    });

    logger.info('createThread', `Thread created: "${thread.title}" by user ${input.authorId}`);

    return thread.populate<{ author: PopulatedAuthor }>({
        path:   'author',
        select: 'fullName username avatar',
    }) as unknown as Promise<PopulatedThread>;
};

/** Returns a paginated list of threads, sorted: pinned first, then by lastActiveAt. */
export const getThreads = async ({
    category,
    search,
    page  = 1,
    limit = 20,
}: GetThreadsQuery): Promise<{
    threads:    (PopulatedThread & { lastActive: string })[];
    pagination: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean };
}> => {
    const query: Record<string, unknown> = { isDeleted: false };

    if (category && category !== 'all') {
        query.category = category;
    }

    if (search?.trim()) {
        query.$text = { $search: search.trim() };
    }

    const skip = (page - 1) * limit;

    const [threads, total] = await Promise.all([
        ForumThread.find(query)
            .populate<{ author: PopulatedAuthor }>({ path: 'author', select: 'fullName username avatar' })
            .sort({ pinned: -1, hot: -1, lastActiveAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<PopulatedThread[]>(),
        ForumThread.countDocuments(query),
    ]);

    const formatted = threads.map(t => ({
        ...t,
        lastActive: formatLastActive(t.lastActiveAt),
    }));

    return {
        threads: formatted,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore:    page * limit < total,
        },
    };
};

/** Returns a single thread by ID (increments viewCount) plus its replies. */
export const getThreadById = async (threadId: string): Promise<{
    thread:  PopulatedThread & { lastActive: string };
    replies: PopulatedReply[];
}> => {
    const thread = await ForumThread.findOneAndUpdate(
        { _id: threadId, isDeleted: false },
        { $inc: { viewCount: 1 } },
        { new: true },
    ).populate<{ author: PopulatedAuthor }>({ path: 'author', select: 'fullName username avatar' });

    if (!thread) throw new Error('Thread not found');

    const replies = await ForumReply.find({ thread: threadId, isDeleted: false })
        .populate<{ author: PopulatedAuthor }>({ path: 'author', select: 'fullName username avatar' })
        .sort({ createdAt: 1 })
        .lean<PopulatedReply[]>();

    logger.info('getThreadById', `Thread viewed: ${threadId}`);

    return {
        thread: {
            ...(thread.toObject() as PopulatedThread),
            lastActive: formatLastActive(thread.lastActiveAt),
        },
        replies,
    };
};

/** Soft-deletes a thread (admin only). Also soft-deletes all its replies. */
export const deleteThread = async (threadId: string): Promise<void> => {
    const thread = await ForumThread.findById(threadId);
    if (!thread || thread.isDeleted) throw new Error('Thread not found');

    thread.isDeleted = true;
    await thread.save();

    await ForumReply.updateMany({ thread: threadId }, { isDeleted: true });

    logger.info('deleteThread', `Thread ${threadId} soft-deleted`);
};

/** Toggles the pinned state of a thread (admin only). */
export const togglePinThread = async (threadId: string): Promise<IForumThread> => {
    const thread = await ForumThread.findOne({ _id: threadId, isDeleted: false });
    if (!thread) throw new Error('Thread not found');

    thread.pinned = !thread.pinned;
    await thread.save();

    logger.info('togglePinThread', `Thread ${threadId} pinned=${thread.pinned}`);

    return thread;
};

/** Toggles the hot (trending) state of a thread (admin only). */
export const toggleHotThread = async (threadId: string): Promise<IForumThread> => {
    const thread = await ForumThread.findOne({ _id: threadId, isDeleted: false });
    if (!thread) throw new Error('Thread not found');

    thread.hot = !thread.hot;
    await thread.save();

    logger.info('toggleHotThread', `Thread ${threadId} hot=${thread.hot}`);

    return thread;
};

/** Creates a reply on a thread, optionally uploading an image to Cloudinary. */
export const createReply = async ({
    threadId,
    authorId,
    body,
    file,
}: CreateReplyInput): Promise<PopulatedReply> => {
    const thread = await ForumThread.findOne({ _id: threadId, isDeleted: false });
    if (!thread) throw new Error('Thread not found');

    let imageUrl: string | undefined;
    if (file) {
        imageUrl = await uploadToCloudinary(file.buffer);
        logger.info('createReply', `Image uploaded for reply by user ${authorId}`);
    }

    const reply = await ForumReply.create({
        thread: threadId,
        author: authorId,
        body,
        imageUrl,
    });

    thread.replyCount  += 1;
    thread.lastActiveAt = new Date();
    await thread.save();

    logger.info('createReply', `Reply created on thread ${threadId} by user ${authorId}`);

    return reply.populate<{ author: PopulatedAuthor }>({
        path:   'author',
        select: 'fullName username avatar',
    }) as unknown as Promise<PopulatedReply>;
};

/** Soft-deletes a reply. Authors can delete their own; admins can delete any. */
export const deleteReply = async (
    replyId:     string,
    requesterId: string,
    isAdmin:     boolean,
): Promise<void> => {
    const reply = await ForumReply.findById(replyId);
    if (!reply || reply.isDeleted) throw new Error('Reply not found');

    const isOwner = reply.author.toString() === requesterId;
    if (!isOwner && !isAdmin) throw new Error('Not authorised to delete this reply');

    reply.isDeleted = true;
    await reply.save();

    await ForumThread.findByIdAndUpdate(reply.thread, { $inc: { replyCount: -1 } });

    logger.info('deleteReply', `Reply ${replyId} soft-deleted by user ${requesterId}`);
};

/** Toggles a like on a reply. Returns updated like count and whether the user now likes it. */
export const toggleReplyLike = async (
    replyId: string,
    userId:  string,
): Promise<{ likes: number; liked: boolean }> => {
    const reply = await ForumReply.findOne({ _id: replyId, isDeleted: false });
    if (!reply) throw new Error('Reply not found');

    const alreadyLiked = reply.likes.some(id => id.toString() === userId);

    if (alreadyLiked) {
        reply.likes = reply.likes.filter(id => id.toString() !== userId);
    } else {
        reply.likes.push(new Types.ObjectId(userId));
    }

    await reply.save();

    logger.info('toggleReplyLike', `Reply ${replyId} ${alreadyLiked ? 'unliked' : 'liked'} by user ${userId}`);

    return { likes: reply.likes.length, liked: !alreadyLiked };
};

/** Fetches and aggregates a user's recent forum activity (threads, replies, and likes). */
export const getUserActivity = async (userId: string): Promise<IUserActivity[]> => {
    // 1. Get user's threads
    const threads = await ForumThread.find({ author: userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

    // 2. Get user's replies
    const replies = await ForumReply.find({ author: userId, isDeleted: false })
        .populate('thread', 'title category isDeleted')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

    // 3. Get replies the user liked
    const likedReplies = await ForumReply.find({ likes: userId, isDeleted: false })
        .populate('thread', 'title category isDeleted')
        .sort({ updatedAt: -1 }) // Sort by updatedAt as a proxy for when it might have been liked
        .limit(20)
        .lean();

    const activity: IUserActivity[] = [];

    // Map Threads
    threads.forEach(t => {
        activity.push({
            _id: t._id.toString(),
            type: 'thread',
            title: t.title,
            category: t.category,
            threadId: t._id.toString(),
            createdAt: (t.createdAt as Date).toISOString()
        });
    });

    // Map Replies
    replies.forEach(r => {
        const threadInfo = r.thread as any;
        if (!threadInfo || threadInfo.isDeleted) return;
        activity.push({
            _id: r._id.toString(),
            type: 'reply',
            title: threadInfo.title,
            category: threadInfo.category,
            threadId: threadInfo._id.toString(),
            createdAt: (r.createdAt as Date).toISOString()
        });
    });

    // Map Likes
    likedReplies.forEach(r => {
        const threadInfo = r.thread as any;
        if (!threadInfo || threadInfo.isDeleted) return;
        activity.push({
            _id: r._id.toString() + '_like', // unique key to avoid react mapping issues
            type: 'like',
            title: threadInfo.title,
            category: threadInfo.category,
            threadId: threadInfo._id.toString(),
            createdAt: (r.updatedAt as Date).toISOString() 
        });
    });

    // Sort the combined array so the most recent actions are at the top
    activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Return the 50 most recent actions
    return activity.slice(0, 50);
};