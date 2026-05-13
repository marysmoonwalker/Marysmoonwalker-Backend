import { Request, Response, NextFunction } from 'express';
import {
    createThread,
    getThreads,
    getThreadById,
    deleteThread,
    togglePinThread,
    toggleHotThread,
    createReply,
    deleteReply,
    toggleReplyLike,
} from '../services/forum.service';

const logger = {
    info: (context: string, message: string) => {
        console.log(`[${new Date().toISOString()}] [INFO] [${context}]: ${message}`);
    },
    error: (context: string, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const stack   = error instanceof Error ? error.stack   : undefined;
        console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
        if (stack) console.error(stack);
    },
};

/**
 * Maps known service-level error messages to the correct HTTP status code.
 * 403/404 are handled here; everything else falls to the global error handler.
 */
const resolveStatus = (error: unknown): number => {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('not found'))      return 404;
    if (msg.includes('Not authorised')) return 403;
    return 500;
};

/** req.params values are always strings at runtime — this cast is safe. */
const id = (param: string | string[]): string => param as string;


/**
 * GET /forum/threads
 * Query params: category, search, page, limit
 * Public.
 */
export const listThreads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { category, search, page, limit } = req.query;

        const result = await getThreads({
            category: category as string | undefined,
            search:   search   as string | undefined,
            page:     page     ? Number(page)  : 1,
            limit:    limit    ? Number(limit) : 20,
        });

        res.status(200).json({
            status: 'success',
            data:   result,
        });
    } catch (error) {
        logger.error('listThreads', error);
        next(error);
    }
};

/**
 * GET /forum/threads/:id
 * Returns thread + all replies. Increments viewCount.
 * Public.
 */
export const getThread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getThreadById(id(req.params.id));

        res.status(200).json({
            status: 'success',
            data:   result,
        });
    } catch (error) {
        logger.error('getThread', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};

/**
 * POST /forum/threads
 * Body: { title, body, excerpt?, category }
 * Auth required.
 */
export const createNewThread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { title, body, excerpt, category } = req.body;

        if (!title?.trim() || !body?.trim() || !category?.trim()) {
            res.status(400).json({
                status:  'error',
                message: 'title, body, and category are required.',
            });
            return;
        }

        const thread = await createThread({
            title,
            body,
            excerpt,
            category,
            authorId: req.user!.id,
        });

        res.status(201).json({
            status:  'success',
            message: 'Discussion created successfully.',
            data:    thread,
        });
    } catch (error) {
        logger.error('createNewThread', error);
        next(error);
    }
};

/**
 * DELETE /forum/threads/:id
 * Admin only — enforced by restrictTo('admin') in the router.
 */
export const removeThread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await deleteThread(id(req.params.id));

        res.status(200).json({
            status:  'success',
            message: 'Thread deleted successfully.',
        });
    } catch (error) {
        logger.error('removeThread', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};

/**
 * PATCH /forum/threads/:id/pin
 * Admin only — enforced by restrictTo('admin') in the router.
 */
export const pinThread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const thread = await togglePinThread(id(req.params.id));

        res.status(200).json({
            status:  'success',
            message: `Thread ${thread.pinned ? 'pinned' : 'unpinned'} successfully.`,
            data:    { pinned: thread.pinned },
        });
    } catch (error) {
        logger.error('pinThread', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};

/**
 * PATCH /forum/threads/:id/hot
 * Admin only — enforced by restrictTo('admin') in the router.
 */
export const hotThread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const thread = await toggleHotThread(id(req.params.id));

        res.status(200).json({
            status:  'success',
            message: `Thread ${thread.hot ? 'marked as hot' : 'unmarked as hot'} successfully.`,
            data:    { hot: thread.hot },
        });
    } catch (error) {
        logger.error('hotThread', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};

/**
 * POST /forum/threads/:id/replies
 * Body: { body }  |  multipart/form-data with optional image field
 * Auth required.
 */
export const addReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { body } = req.body;

        if (!body?.trim()) {
            res.status(400).json({
                status:  'error',
                message: 'Reply body is required.',
            });
            return;
        }

        const reply = await createReply({
            threadId: id(req.params.id),
            authorId: req.user!.id,
            body,
            file:     req.file,
        });

        res.status(201).json({
            status:  'success',
            message: 'Reply posted successfully.',
            data:    reply,
        });
    } catch (error) {
        logger.error('addReply', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};

/**
 * DELETE /forum/replies/:id
 * Owner or admin — ownership enforced in service, admin enforced in router.
 */
export const removeReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await deleteReply(id(req.params.id), req.user!.id, req.user!.role === 'admin');

        res.status(200).json({
            status:  'success',
            message: 'Reply deleted successfully.',
        });
    } catch (error) {
        logger.error('removeReply', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};

/**
 * PATCH /forum/replies/:id/like
 * Auth required.
 */
export const likeReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await toggleReplyLike(id(req.params.id), req.user!.id);

        res.status(200).json({
            status: 'success',
            data:   result,
        });
    } catch (error) {
        logger.error('likeReply', error);
        const status = resolveStatus(error);
        if (status !== 500) {
            res.status(status).json({ status: 'error', message: (error as Error).message });
            return;
        }
        next(error);
    }
};