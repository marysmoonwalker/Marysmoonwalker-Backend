import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory,
    createPost,
    getPosts,
    searchPosts,
    getFeaturedPosts,
    getTrendingPosts,
    getPostBySlug,
    updatePost,
    deletePost,
    toggleFeaturePost,
    togglePinTrendingPost,
    recordPostView,
} from '../services/post.service';
import { ICategory, IPost, IPostSection } from '../models/Post.model';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const logger = {
    warn: (context: string, message: string) => {
        console.warn(`[${new Date().toISOString()}] [WARN] [${context}]: ${message}`);
    },
    error: (context: string, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
    },
};

const parseSections = (raw: unknown): IPostSection[] => {
    if (!raw) return [];
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }
    if (Array.isArray(raw)) return raw;
    return [];
};

const injectSectionImages = async (
    sections: IPostSection[],
    files: Express.Multer.File[],
): Promise<IPostSection[]> => {
    if (!files.length) return sections;

    const imageIndexes = sections
        .map((section, i) => (section.type === 'image' ? i : -1))
        .filter(i => i !== -1);

    if (files.length !== imageIndexes.length) {
        logger.warn(
            'injectSectionImages',
            `File/section count mismatch — ${files.length} file(s) uploaded but ${imageIndexes.length} image section(s) found.`,
        );
    }

    const uploadedUrls = await Promise.all(
        files.map(file => uploadToCloudinary(file.buffer)),
    );

    const result = [...sections];
    imageIndexes.forEach((sectionIndex, fileIndex) => {
        if (uploadedUrls[fileIndex]) {
            result[sectionIndex] = { ...result[sectionIndex], mediaUrl: uploadedUrls[fileIndex] };
        }
    });

    return result;
};


/** Creates a new category. */
export const createCat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const category: ICategory = await createCategory(req.user!.id, req.body);
        res.status(201).json({ status: 'success', data: category });
    } catch (error) {
        logger.error('createCat', error);
        next(error);
    }
};

/** Fetches all categories. */
export const getCats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const categories: ICategory[] = await getAllCategories();
        res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
        logger.error('getCats', error);
        next(error);
    }
};

/** Updates an existing category by ID. */
export const updateCat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        const category: ICategory = await updateCategory(req.user!.id, id, req.body);
        res.status(200).json({ status: 'success', data: category });
    } catch (error) {
        logger.error('updateCat', error);
        next(error);
    }
};

/** Deletes a category by ID. Fails if any posts are still assigned to it. */
export const removeCat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        await deleteCategory(req.user!.id, id);
        res.status(200).json({ status: 'success', message: 'Category deleted.' });
    } catch (error) {
        logger.error('removeCat', error);
        next(error);
    }
};

/**
 * Creates a new post.
 * - Article: accepts thumbnail file upload and section image uploads.
 * - Video: accepts optional thumbnail upload; if none provided, thumbnail is auto-generated from YouTube URL.
 * - Audio: accepts optional thumbnail upload; mediaUrl is a Spotify link passed in the request body.
 */
export const createPst = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        let sections = parseSections(req.body.sections);

        const thumbnailFile = files?.thumbnail?.[0];
        const thumbnail = thumbnailFile
            ? await uploadToCloudinary(thumbnailFile.buffer)
            : undefined;

        const sectionImageFiles = files?.sectionImages ?? [];
        sections = await injectSectionImages(sections, sectionImageFiles);

        const post: IPost = await createPost(req.user!.id, {
            ...req.body,
            sections,
            ...(thumbnail && { thumbnail }),
        });

        res.status(201).json({ status: 'success', data: post });
    } catch (error) {
        logger.error('createPst', error);
        next(error);
    }
};

/**
 * Fetches a paginated list of posts.
 * Supports query params: page, limit, status, type (article | video | audio), category, tags.
 * For text search, use the dedicated /posts/search endpoint instead.
 */
export const fetchPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page  = parseInt(req.query.page  as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const { category, status, type, tags } = req.query;

        const query: Record<string, any> = {};

        if (status) {
            query.status = status;
        }

        if (type && ['article', 'video', 'audio'].includes(type as string)) {
            query.type = type;
        }

        if (category && Types.ObjectId.isValid(category as string)) {
            query.category = category;
        }

        if (tags) {
            const tagList = (tags as string).split(',').map(t => t.trim()).filter(Boolean);
            if (tagList.length) query.tags = { $in: tagList };
        }

        const result = await getPosts(query, page, limit);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('fetchPosts', error);
        next(error);
    }
};

/**
 * Searches posts by text across title and excerpt using MongoDB full-text index.
 * Supports query params: q (search text), type (article | video | audio), category, page, limit.
 * Results are ranked by relevance score.
 */
export const fetchSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page  = parseInt(req.query.page  as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const searchText = (req.query.q as string)?.trim();

        if (!searchText) {
            res.status(400).json({ status: 'fail', message: 'Search query "q" is required.' });
            return;
        }

        const filters: { type?: 'article' | 'video' | 'audio'; category?: string } = {};

        if (req.query.type && ['article', 'video', 'audio'].includes(req.query.type as string)) {
            filters.type = req.query.type as 'article' | 'video' | 'audio';
        }

        if (req.query.category && Types.ObjectId.isValid(req.query.category as string)) {
            filters.category = req.query.category as string;
        }

        const result = await searchPosts(searchText, filters, page, limit);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        logger.error('fetchSearch', error);
        next(error);
    }
};

/** Fetches published featured posts. Defaults to 5 results. */
export const fetchFeatured = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 5;
        const posts: IPost[] = await getFeaturedPosts(limit);
        res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        logger.error('fetchFeatured', error);
        next(error);
    }
};

/**
 * Fetches trending published posts sorted by pinned status, trending score, then date.
 * Supports optional query param: type (article | video | audio) to filter by content type.
 * Defaults to all types combined.
 */
export const fetchTrending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;

        let type: 'article' | 'video' | 'audio' | undefined;
        if (req.query.type && ['article', 'video', 'audio'].includes(req.query.type as string)) {
            type = req.query.type as 'article' | 'video' | 'audio';
        }

        const posts: IPost[] = await getTrendingPosts(limit, type);
        res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        logger.error('fetchTrending', error);
        next(error);
    }
};

/** Fetches a single post by its slug and fires a background view tracking event. */
export const fetchPostBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const slug = req.params.slug as string;
        const post: IPost = await getPostBySlug(slug);

        recordPostView(
            (post as any)._id.toString(),
            req.user?.id,
            req.ip,
            req.headers['user-agent'],
        ).catch(() => {});

        res.status(200).json({ status: 'success', data: post });
    } catch (error) {
        logger.error('fetchPostBySlug', error);
        next(error);
    }
};

/**
 * Updates an existing post by ID.
 * - Article: accepts new thumbnail and section image uploads.
 * - Video: accepts optional thumbnail upload; if mediaUrl is changed and no thumbnail uploaded, auto-regenerates from YouTube.
 * - Audio: accepts optional thumbnail upload; mediaUrl updated via request body. //Implement the thumbnail features.
 */
export const updatePst = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id    = req.params.id as string;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        let sections = parseSections(req.body.sections);

        const thumbnailFile = files?.thumbnail?.[0];
        const thumbnail = thumbnailFile
            ? await uploadToCloudinary(thumbnailFile.buffer)
            : undefined;

        const sectionImageFiles = files?.sectionImages ?? [];
        if (sections.length) {
            sections = await injectSectionImages(sections, sectionImageFiles);
        }

        const updateData = {
            ...req.body,
            ...(sections.length && { sections }),
            ...(thumbnail        && { thumbnail }),
        };

        const post: IPost = await updatePost(req.user!.id, id, updateData);
        res.status(200).json({ status: 'success', data: post });
    } catch (error) {
        logger.error('updatePst', error);
        next(error);
    }
};

/** Deletes a post by ID. */
export const removePst = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        await deletePost(req.user!.id, id);
        res.status(200).json({ status: 'success', message: 'Post deleted.' });
    } catch (error) {
        logger.error('removePst', error);
        next(error);
    }
};

/** Toggles the featured status of a post. */
export const toggleFeatured = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        const post: IPost = await toggleFeaturePost(req.user!.id, id);
        res.status(200).json({ status: 'success', data: post });
    } catch (error) {
        logger.error('toggleFeatured', error);
        next(error);
    }
};

/** Toggles whether a post is pinned to the top of the trending section. */
export const toggleTrendingPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = req.params.id as string;
        const post: IPost = await togglePinTrendingPost(req.user!.id, id);
        res.status(200).json({ status: 'success', data: post });
    } catch (error) {
        logger.error('toggleTrendingPin', error);
        next(error);
    }
};