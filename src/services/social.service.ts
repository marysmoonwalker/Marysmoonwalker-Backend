import { Types } from 'mongoose';
import { Comment, IComment, Reaction, ReactionType, Bookmark, Notification } from '../models/Social.model';
import { Post } from '../models/Post.model';

/** Creates a notification and silently swallows any error so it never breaks the main action. */
const notify = async (payload: {
    userId:     string | Types.ObjectId;
    type:       'comment_reply' | 'reaction' | 'mention';
    actorId:    string | Types.ObjectId;
    targetId:   string | Types.ObjectId;
    targetType: 'post' | 'comment';
}) => {
    try {
        if (payload.userId.toString() === payload.actorId.toString()) return;
        await Notification.create(payload);
    } catch {
    }
};

/** Returns paginated top-level comments for a post, each with their direct replies attached. */
export const getComments = async (postId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const [topLevel, total] = await Promise.all([
        Comment.find({ postId, parentId: null, isDeleted: false })
            .populate('userId', 'fullName avatar username')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit),
        Comment.countDocuments({ postId, parentId: null, isDeleted: false }),
    ]);

    const topLevelIds = topLevel.map(c => c._id as Types.ObjectId);

    const replies = await Comment.find({ parentId: { $in: topLevelIds }, isDeleted: false })
        .populate('userId', 'fullName avatar username')
        .sort({ createdAt: 1 });

    const replyMap: Record<string, any[]> = {};
    
    for (const reply of replies) {
        const key = reply.parentId?.toString();
        if (key) {
            if (!replyMap[key]) replyMap[key] = [];
            replyMap[key].push(reply);
        }
    }

    const data = topLevel.map(comment => {
        const commentId = (comment._id as Types.ObjectId).toString();
        
        return {
            ...comment.toObject(),
            replies: replyMap[commentId] ?? [],
        };
    });

    return { data, total, page, totalPages: Math.ceil(total / limit) };
};

/** Posts a top-level comment on a post. */
export const addComment = async (postId: string, userId: string, body: string) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const comment = await Comment.create({ postId, userId, body, parentId: null });

    return comment.populate('userId', 'fullName avatar username');
};

/** Posts a reply to an existing comment and notifies the parent comment author. */
export const addReply = async (parentId: string, userId: string, body: string) => {
    const parent = await Comment.findById(parentId);
    if (!parent)            throw new Error('Comment not found');
    if (parent.isDeleted)   throw new Error('Cannot reply to a deleted comment');
    if (parent.parentId)    throw new Error('Cannot reply to a reply — only one level of nesting is supported');

    const reply = await Comment.create({
        postId:   parent.postId,
        userId,
        body,
        parentId: parent._id,
    });

    await notify({
        userId:     parent.userId,
        type:       'comment_reply',
        actorId:    userId,
        targetId:   reply._id as Types.ObjectId,
        targetType: 'comment',
    });

    return reply.populate('userId', 'fullName avatar username');
};

/** Updates the body of a comment owned by the requesting user. */
export const editComment = async (commentId: string, userId: string, body: string) => {
    const comment = await Comment.findById(commentId);
    if (!comment)          throw new Error('Comment not found');
    if (comment.isDeleted) throw new Error('Cannot edit a deleted comment');
    if (comment.userId.toString() !== userId) throw new Error('Not authorised to edit this comment');

    comment.body     = body;
    comment.isEdited = true;
    await comment.save();

    return comment;
};

/** Soft-deletes a comment. Owner or admin may delete. */
export const removeComment = async (commentId: string, userId: string, role: string) => {
    const comment = await Comment.findById(commentId);
    if (!comment)          throw new Error('Comment not found');
    if (comment.isDeleted) throw new Error('Comment is already deleted');

    const isOwner = comment.userId.toString() === userId;
    const isAdmin = role === 'admin';
    if (!isOwner && !isAdmin) throw new Error('Not authorised to delete this comment');

    comment.isDeleted = true;
    comment.body      = '[deleted]';
    await comment.save();

    return comment;
};

/**
 * Toggles a reaction on a post or comment.
 * - If the user has no reaction: creates it and notifies the target owner.
 * - If the user reacts with the same type: removes it (unreact).
 * - If the user reacts with a different type: updates it.
 */
export const toggleReaction = async (
    userId:       string,
    targetId:     string,
    targetType:   'post' | 'comment',
    reactionType: ReactionType,
) => {
    const existing = await Reaction.findOne({ userId, targetId, targetType });

    if (!existing) {
        const reaction = await Reaction.create({ userId, targetId, targetType, reactionType });

        let ownerId: string | null = null;
        if (targetType === 'post') {
            const post = await Post.findById(targetId).select('author');
            ownerId = post?.author?.toString() ?? null;
        } else {
            const comment = await Comment.findById(targetId).select('userId');
            ownerId = comment?.userId?.toString() ?? null;
        }

        if (ownerId) {
            await notify({
                userId:     ownerId,
                type:       'reaction',
                actorId:    userId,
                targetId,
                targetType,
            });
        }

        return { action: 'added', reaction };
    }

    if (existing.reactionType === reactionType) {
        await existing.deleteOne();
        return { action: 'removed', reaction: null };
    }

    existing.reactionType = reactionType;
    await existing.save();
    return { action: 'updated', reaction: existing };
};

/** Returns a grouped reaction count object for a post or comment target. */
export const getReactions = async (targetId: string, targetType: 'post' | 'comment') => {
    const reactions = await Reaction.find({ targetId, targetType });

    const counts: Record<ReactionType, number> = { like: 0, love: 0, fire: 0, sad: 0, wow: 0 };
    for (const r of reactions) {
        counts[r.reactionType] = (counts[r.reactionType] ?? 0) + 1;
    }

    return { total: reactions.length, counts };
};

/** Toggles a bookmark on a post — creates it if absent, deletes it if present. */
export const toggleBookmark = async (userId: string, postId: string) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const existing = await Bookmark.findOne({ userId, postId });

    if (existing) {
        await existing.deleteOne();
        return { action: 'removed' };
    }

    await Bookmark.create({ userId, postId });
    return { action: 'added' };
};

/** Returns all bookmarked posts for the authenticated user, newest first. */
export const getUserBookmarks = async (userId: string) => {
    return await Bookmark.find({ userId })
        .populate({
            path:     'postId',
            select:   'title slug thumbnail readTime category author createdAt',
            populate: [
                { path: 'category', select: 'name slug color' },
                { path: 'author',   select: 'fullName avatar username' },
            ],
        })
        .sort({ createdAt: -1 });
};

/** Returns paginated notifications for the authenticated user, newest first. */
export const getNotifications = async (userId: string, page: number = 1, limit: number = 20) => {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
        Notification.find({ userId })
            .populate('actorId', 'fullName avatar username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Notification.countDocuments({ userId }),
    ]);

    return { notifications, total, page, totalPages: Math.ceil(total / limit) };
};

/** Marks a single notification as read. */
export const markNotificationRead = async (notificationId: string, userId: string) => {
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) throw new Error('Notification not found');

    notification.isRead = true;
    await notification.save();

    return notification;
};

/** Marks all notifications for the authenticated user as read. */
export const markAllNotificationsRead = async (userId: string) => {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};

/** Permanently deletes a single notification owned by the user. */
export const deleteNotification = async (notificationId: string, userId: string) => {
    const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
    if (!notification) throw new Error('Notification not found');
    return notification;
};

/** Full-text search across published posts by title and body, with optional type and category filters. */
export const searchPosts = async (
    q:        string,
    type?:    string,
    category?: string,
    page:     number = 1,
    limit:    number = 10,
) => {
    if (!q || q.trim().length < 2) throw new Error('Search query must be at least 2 characters');

    const skip   = (page - 1) * limit;
    const filter: Record<string, any> = {
        status: 'published',
        $or: [
            { title: { $regex: q, $options: 'i' } },
            { body:  { $regex: q, $options: 'i' } },
            { tags:  { $regex: q, $options: 'i' } },
        ],
    };

    if (type)     filter.type     = type;
    if (category) filter.category = category;

    const [posts, total] = await Promise.all([
        Post.find(filter)
            .populate('category', 'name slug color')
            .populate('author',   'fullName avatar username')
            .select('title slug thumbnail readTime type category author tags createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Post.countDocuments(filter),
    ]);

    return { posts, total, page, totalPages: Math.ceil(total / limit), query: q };
};