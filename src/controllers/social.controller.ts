// import { Request, Response, NextFunction } from 'express';
// import {
//     getComments,
//     addComment,
//     addReply,
//     editComment,
//     removeComment,
//     toggleReaction,
//     getReactions,
//     toggleBookmark,
//     getUserBookmarks,
//     getNotifications,
//     markNotificationRead,
//     markAllNotificationsRead,
//     deleteNotification,
//     searchPosts,
// } from '../services/social.service';

// const logger = {
//     error: (context: string, error: unknown) => {
//         const message = error instanceof Error ? error.message : String(error);
//         console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
//     },
// };

// /** Returns paginated top-level comments with replies for a post. */
// export const fetchComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const page  = parseInt(req.query.page  as string) || 1;
//         const limit = parseInt(req.query.limit as string) || 10;
//         const result = await getComments(req.params.postId, page, limit);
//         res.status(200).json({ status: 'success', data: result });
//     } catch (error) {
//         logger.error('fetchComments', error);
//         next(error);
//     }
// };

// /** Posts a top-level comment on a post. */
// export const postComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const comment = await addComment(req.params.postId, req.user!.id, req.body.body);
//         res.status(201).json({ status: 'success', data: comment });
//     } catch (error) {
//         logger.error('postComment', error);
//         next(error);
//     }
// };

// /** Posts a reply to an existing comment. */
// export const postReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const reply = await addReply(req.params.id, req.user!.id, req.body.body);
//         res.status(201).json({ status: 'success', data: reply });
//     } catch (error) {
//         logger.error('postReply', error);
//         next(error);
//     }
// };

// /** Updates the body of a comment owned by the requesting user. */
// export const updateComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const comment = await editComment(req.params.id, req.user!.id, req.body.body);
//         res.status(200).json({ status: 'success', data: comment });
//     } catch (error) {
//         logger.error('updateComment', error);
//         next(error);
//     }
// };

// /** Soft-deletes a comment. Owner or admin may delete. */
// export const deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         await removeComment(req.params.id, req.user!.id, req.user!.role);
//         res.status(200).json({ status: 'success', message: 'Comment deleted.' });
//     } catch (error) {
//         logger.error('deleteComment', error);
//         next(error);
//     }
// };

// /** Toggles a reaction on a post. */
// export const reactToPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const result = await toggleReaction(req.user!.id, req.params.id, 'post', req.body.reactionType);
//         res.status(200).json({ status: 'success', data: result });
//     } catch (error) {
//         logger.error('reactToPost', error);
//         next(error);
//     }
// };

// /** Toggles a reaction on a comment. */
// export const reactToComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const result = await toggleReaction(req.user!.id, req.params.id, 'comment', req.body.reactionType);
//         res.status(200).json({ status: 'success', data: result });
//     } catch (error) {
//         logger.error('reactToComment', error);
//         next(error);
//     }
// };

// /** Returns reaction counts for a post. */
// export const fetchPostReactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const result = await getReactions(req.params.id, 'post');
//         res.status(200).json({ status: 'success', data: result });
//     } catch (error) {
//         logger.error('fetchPostReactions', error);
//         next(error);
//     }
// };

// /** Toggles a bookmark on a post for the authenticated user. */
// export const toggleBookmarkPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const result = await toggleBookmark(req.user!.id, req.params.postId);
//         res.status(200).json({ status: 'success', data: result });
//     } catch (error) {
//         logger.error('toggleBookmarkPost', error);
//         next(error);
//     }
// };

// /** Returns all bookmarked posts for the authenticated user. */
// export const fetchBookmarks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const bookmarks = await getUserBookmarks(req.user!.id);
//         res.status(200).json({ status: 'success', data: bookmarks });
//     } catch (error) {
//         logger.error('fetchBookmarks', error);
//         next(error);
//     }
// };

// /** Returns paginated notifications for the authenticated user. */
// export const fetchNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const page  = parseInt(req.query.page  as string) || 1;
//         const limit = parseInt(req.query.limit as string) || 20;
//         const result = await getNotifications(req.user!.id, page, limit);
//         res.status(200).json({ status: 'success', data: result });
//     } catch (error) {
//         logger.error('fetchNotifications', error);
//         next(error);
//     }
// };

// /** Marks a single notification as read. */
// export const readNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const notification = await markNotificationRead(req.params.id, req.user!.id);
//         res.status(200).json({ status: 'success', data: notification });
//     } catch (error) {
//         logger.error('readNotification', error);
//         next(error);
//     }
// };

// /** Marks all notifications as read for the authenticated user. */
// export const readAllNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         await markAllNotificationsRead(req.user!.id);
//         res.status(200).json({ status: 'success', message: 'All notifications marked as read.' });
//     } catch (error) {
//         logger.error('readAllNotifications', error);
//         next(error);
//     }
// };

// /** Permanently deletes a notification owned by the authenticated user. */
// export const removeNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         await deleteNotification(req.params.id, req.user!.id);
//         res.status(200).json({ status: 'success', message: 'Notification deleted.' });
//     } catch (error) {
//         logger.error('removeNotification', error);
//         next(error);
//     }
// };

// /** Full-text search across published posts by title, body, and tags. */
// export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const q        = req.query.q        as string;
//         const type     = req.query.type     as string | undefined;
//         const category = req.query.category as string | undefined;
//         const page     = parseInt(req.query.page  as string) || 1;
//         const limit    = parseInt(req.query.limit as string) || 10;

//         const result = await searchPosts(q, type, category, page, limit);
//         res.status(200).json({ status: 'success', data: result });
//     } catch (error) {
//         logger.error('search', error);
//         next(error);
//     }
// };














import { Request, Response, NextFunction } from 'express';
import {
    getComments,
    addComment,
    addReply,
    editComment,
    removeComment,
    toggleReaction,
    getReactions,
    toggleBookmark,
    getUserBookmarks,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    searchPosts,
} from '../services/social.service';

const logger = {
    error: (context: string, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
    },
};

/** Returns paginated top-level comments with replies for a post. */
export const fetchComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page  = parseInt(req.query.page  as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await getComments(req.params.postId as string, page, limit);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('fetchComments', error);
        next(error);
    }
};

/** Posts a top-level comment on a post. */
export const postComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const comment = await addComment(req.params.postId as string, req.user!.id, req.body.body);
        res.status(201).json({ status: 'success', data: comment });
    } catch (error) {
        logger.error('postComment', error);
        next(error);
    }
};

/** Posts a reply to an existing comment. */
export const postReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const reply = await addReply(req.params.id as string, req.user!.id, req.body.body);
        res.status(201).json({ status: 'success', data: reply });
    } catch (error) {
        logger.error('postReply', error);
        next(error);
    }
};

/** Updates the body of a comment owned by the requesting user. */
export const updateComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const comment = await editComment(req.params.id as string, req.user!.id, req.body.body);
        res.status(200).json({ status: 'success', data: comment });
    } catch (error) {
        logger.error('updateComment', error);
        next(error);
    }
};

/** Soft-deletes a comment. Owner or admin may delete. */
export const deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await removeComment(req.params.id as string, req.user!.id, req.user!.role);
        res.status(200).json({ status: 'success', message: 'Comment deleted.' });
    } catch (error) {
        logger.error('deleteComment', error);
        next(error);
    }
};

/** Toggles a reaction on a post. */
export const reactToPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await toggleReaction(req.user!.id, req.params.id as string, 'post', req.body.reactionType);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('reactToPost', error);
        next(error);
    }
};

/** Toggles a reaction on a comment. */
export const reactToComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await toggleReaction(req.user!.id, req.params.id as string, 'comment', req.body.reactionType);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('reactToComment', error);
        next(error);
    }
};

/** Returns reaction counts for a post. */
export const fetchPostReactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getReactions(req.params.id as string, 'post');
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('fetchPostReactions', error);
        next(error);
    }
};

/** Toggles a bookmark on a post for the authenticated user. */
export const toggleBookmarkPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await toggleBookmark(req.user!.id, req.params.postId as string);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('toggleBookmarkPost', error);
        next(error);
    }
};

/** Returns all bookmarked posts for the authenticated user. */
export const fetchBookmarks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const bookmarks = await getUserBookmarks(req.user!.id);
        res.status(200).json({ status: 'success', data: bookmarks });
    } catch (error) {
        logger.error('fetchBookmarks', error);
        next(error);
    }
};

/** Returns paginated notifications for the authenticated user. */
export const fetchNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page  = parseInt(req.query.page  as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await getNotifications(req.user!.id, page, limit);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('fetchNotifications', error);
        next(error);
    }
};

/** Marks a single notification as read. */
export const readNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const notification = await markNotificationRead(req.params.id as string, req.user!.id);
        res.status(200).json({ status: 'success', data: notification });
    } catch (error) {
        logger.error('readNotification', error);
        next(error);
    }
};

/** Marks all notifications as read for the authenticated user. */
export const readAllNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await markAllNotificationsRead(req.user!.id);
        res.status(200).json({ status: 'success', message: 'All notifications marked as read.' });
    } catch (error) {
        logger.error('readAllNotifications', error);
        next(error);
    }
};

/** Permanently deletes a notification owned by the authenticated user. */
export const removeNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await deleteNotification(req.params.id as string, req.user!.id);
        res.status(200).json({ status: 'success', message: 'Notification deleted.' });
    } catch (error) {
        logger.error('removeNotification', error);
        next(error);
    }
};

/** Full-text search across published posts by title, body, and tags. */
export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const q        = req.query.q        as string;
        const type     = req.query.type     as string | undefined;
        const category = req.query.category as string | undefined;
        const page     = parseInt(req.query.page  as string) || 1;
        const limit    = parseInt(req.query.limit as string) || 10;

        const result = await searchPosts(q, type, category, page, limit);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('search', error);
        next(error);
    }
};