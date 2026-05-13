import { Category, ICategory, Post, IPost, PostView } from '../models/Post.model';
import { AuditLog } from '../models/AuditLog.model';
import { Types } from 'mongoose';

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

export interface IGetPostsQuery {
    status?:   'draft' | 'published';
    category?: Types.ObjectId | string;
    type?:     'article' | 'video' | 'audio';
    featured?: boolean;
    tags?:     { $in: string[] };
    $text?:    { $search: string };
}


/** Fetches all categories sorted by most recently created. */
export const getAllCategories = async (): Promise<ICategory[]> => {
    const categories = await Category.find()
        .sort({ createdAt: -1 })
        .lean() as unknown as ICategory[];

    logger.info('getAllCategories', `Fetched ${categories.length} categories`);

    return categories;
};

/** Creates a new category. Throws if a category with the same name already exists. */
export const createCategory = async (adminId: string, data: Partial<ICategory>): Promise<ICategory> => {
    const existing = await Category.findOne({ name: data.name }).lean();
    if (existing) throw new Error('Category with this name already exists');

    const category = await Category.create(data);

    await AuditLog.create({
        userId:   adminId,
        action:   'CATEGORY_CREATED',
        metadata: { categoryId: category._id, name: category.name },
    });

    logger.info('createCategory', `Category created: "${category.name}" by admin ID: ${adminId}`);

    return category;
};

/** Updates an existing category by ID. Throws if the category is not found. */
export const updateCategory = async (adminId: string, id: string, data: Partial<ICategory>): Promise<ICategory> => {
    const category = await Category.findById(id);
    if (!category) throw new Error('Category not found');

    Object.assign(category, data);
    await category.save();

    await AuditLog.create({
        userId:   adminId,
        action:   'CATEGORY_UPDATED',
        metadata: { categoryId: category._id, updates: Object.keys(data) },
    });

    logger.info('updateCategory', `Category ID: ${id} updated by admin ID: ${adminId} | fields: ${Object.keys(data).join(', ')}`);

    return category;
};

/** Deletes a category by ID. Throws if any posts are still assigned to it. */
export const deleteCategory = async (adminId: string, id: string): Promise<ICategory> => {
    const postsUsingCategory = await Post.countDocuments({ category: id });
    if (postsUsingCategory > 0) throw new Error(`Cannot delete category: ${postsUsingCategory} post(s) are still assigned to it`);

    const category = await Category.findByIdAndDelete(id).lean() as unknown as ICategory;
    if (!category) throw new Error('Category not found');

    await AuditLog.create({
        userId:   adminId,
        action:   'CATEGORY_DELETED',
        metadata: { categoryId: id, name: category.name },
    });

    logger.info('deleteCategory', `Category "${category.name}" (ID: ${id}) deleted by admin ID: ${adminId}`);

    return category;
};

/** 
 * Creates a new post. For video posts, if no thumbnail is provided, it is automatically 
 * generated from the YouTube video ID extracted during the pre-save hook. 
 * Manual thumbnail upload always takes priority over the auto-generated one.
 */
export const createPost = async (adminId: string, data: Partial<IPost>): Promise<IPost> => {
    const post = await Post.create({
        ...data,
        author: new Types.ObjectId(adminId),
    });

    if (data.type === 'video' && !data.thumbnail && post.mediaMeta?.videoId) {
        post.thumbnail = `https://img.youtube.com/vi/${post.mediaMeta.videoId}/hqdefault.jpg`;
        await post.save();
    }

    await AuditLog.create({
        userId:   adminId,
        action:   'POST_CREATED',
        metadata: { postId: post._id, title: post.title, type: post.type },
    });

    logger.info('createPost', `Post created: "${post.title}" (ID: ${post._id}) type: ${post.type} by admin ID: ${adminId}`);

    return post;
};

/** 
 * Fetches a paginated list of posts based on query filters. 
 * Supports filtering by status, category, type (article | video | audio), featured flag, and tags.
 */
export const getPosts = async (
    query: IGetPostsQuery = {},
    page: number = 1,
    limit: number = 10,
): Promise<{ posts: IPost[]; total: number; totalPages: number; currentPage: number }> => {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
        Post.find(query)
            .populate('category', 'name slug color')
            .populate('author', 'fullName avatar username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean() as unknown as IPost[],
        Post.countDocuments(query),
    ]);

    logger.info('getPosts', `Fetched ${posts.length} of ${total} posts | page: ${page}, limit: ${limit}`);

    return {
        posts,
        total,
        totalPages:  Math.ceil(total / limit),
        currentPage: page,
    };
};

/** 
 * Searches posts by text across the title and excerpt fields using MongoDB's full-text index.
 * Can be further filtered by type and category. Results are paginated.
 */
export const searchPosts = async (
    searchText: string,
    filters: { type?: 'article' | 'video' | 'audio'; category?: string } = {},
    page: number = 1,
    limit: number = 10,
): Promise<{ posts: IPost[]; total: number; totalPages: number; currentPage: number }> => {
    const skip = (page - 1) * limit;

    const query: IGetPostsQuery = {
        status: 'published',
        $text:  { $search: searchText },
        ...filters,
    };

    const [posts, total] = await Promise.all([
        Post.find(query, { score: { $meta: 'textScore' } })
            .populate('category', 'name slug color')
            .populate('author', 'fullName avatar username')
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .lean() as unknown as IPost[],
        Post.countDocuments(query),
    ]);

    logger.info('searchPosts', `Search: "${searchText}" returned ${posts.length} of ${total} results | page: ${page}`);

    return {
        posts,
        total,
        totalPages:  Math.ceil(total / limit),
        currentPage: page,
    };
};

/** Fetches published featured posts, sorted by most recently created. Defaults to 5 results. */
export const getFeaturedPosts = async (limit: number = 5): Promise<IPost[]> => {
    const posts = await Post.find({ featured: true, status: 'published' })
        .populate('category', 'name slug color')
        .populate('author', 'fullName avatar username')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean() as unknown as IPost[];

    logger.info('getFeaturedPosts', `Fetched ${posts.length} featured posts`);

    return posts;
};

/** 
 * Fetches trending published posts across all types (article, video, audio), sorted by 
 * pinned status first, then trending score, then most recent. Optionally filter by type.
 */
export const getTrendingPosts = async (
    limit: number = 10,
    type?: 'article' | 'video' | 'audio',
): Promise<IPost[]> => {
    const query: Record<string, any> = { status: 'published' };
    if (type) query.type = type;

    const posts = await Post.find(query)
        .populate('category', 'name slug color')
        .populate('author', 'fullName avatar username')
        .sort({ pinnedTrending: -1, trendingScore: -1, createdAt: -1 })
        .limit(limit)
        .lean() as unknown as IPost[];

    logger.info('getTrendingPosts', `Fetched ${posts.length} trending posts${type ? ` | type: ${type}` : ''}`);

    return posts;
};

/** Fetches a single post by its slug. Throws if the post is not found. */
export const getPostBySlug = async (slug: string): Promise<IPost> => {
    const post = await Post.findOne({ slug })
        .populate('category', 'name slug color')
        .populate('author', 'fullName avatar username')
        .lean() as unknown as IPost;

    if (!post) throw new Error('Post not found');

    logger.info('getPostBySlug', `Post fetched by slug: "${slug}"`);

    return post;
};

/** 
 * Updates a post by ID. For video posts, if the mediaUrl is changed and no new thumbnail 
 * is provided, the thumbnail is automatically regenerated from the new YouTube video ID.
 * Manual thumbnail upload always takes priority over the auto-generated one.
 */
export const updatePost = async (adminId: string, id: string, data: Partial<IPost>): Promise<IPost> => {
    const post = await Post.findById(id);
    if (!post) throw new Error('Post not found');

    Object.assign(post, data);
    await post.save();

    if (post.type === 'video' && data.mediaUrl && !data.thumbnail && post.mediaMeta?.videoId) {
        post.thumbnail = `https://img.youtube.com/vi/${post.mediaMeta.videoId}/hqdefault.jpg`;
        await post.save();
    }

    await AuditLog.create({
        userId:   adminId,
        action:   'POST_UPDATED',
        metadata: { postId: post._id, updates: Object.keys(data) },
    });

    logger.info('updatePost', `Post ID: ${id} updated by admin ID: ${adminId} | fields: ${Object.keys(data).join(', ')}`);

    return post;
};

/** Deletes a post by ID. Throws if the post is not found. */
export const deletePost = async (adminId: string, id: string): Promise<IPost> => {
    const post = await Post.findByIdAndDelete(id).lean() as unknown as IPost;
    if (!post) throw new Error('Post not found');

    await AuditLog.create({
        userId:   adminId,
        action:   'POST_DELETED',
        metadata: { postId: id, title: post.title },
    });

    logger.info('deletePost', `Post "${post.title}" (ID: ${id}) deleted by admin ID: ${adminId}`);

    return post;
};

/** Toggles the featured status of a post between true and false. */
export const toggleFeaturePost = async (adminId: string, id: string): Promise<IPost> => {
    const post = await Post.findById(id);
    if (!post) throw new Error('Post not found');

    post.featured = !post.featured;
    await post.save();

    await AuditLog.create({
        userId:   adminId,
        action:   'POST_FEATURED_TOGGLED',
        metadata: { postId: post._id, featured: post.featured },
    });

    logger.info('toggleFeaturePost', `Post ID: ${id} featured status toggled to: ${post.featured} by admin ID: ${adminId}`);

    return post;
};

/** Toggles whether a post is pinned to the top of the trending section. */
export const togglePinTrendingPost = async (adminId: string, id: string): Promise<IPost> => {
    const post = await Post.findById(id);
    if (!post) throw new Error('Post not found');

    post.pinnedTrending = !post.pinnedTrending;
    await post.save();

    await AuditLog.create({
        userId:   adminId,
        action:   'POST_TRENDING_PIN_TOGGLED',
        metadata: { postId: post._id, pinnedTrending: post.pinnedTrending },
    });

    logger.info('togglePinTrendingPost', `Post ID: ${id} pinnedTrending toggled to: ${post.pinnedTrending} by admin ID: ${adminId}`);

    return post;
};

/** Records a unique view for a post within a 24-hour window and triggers trending score recalculation. */
export const recordPostView = async (
    postId:     string,
    userId?:    string,
    ipAddress?: string,
    userAgent?: string,
): Promise<any> => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const alreadyViewed = userId
        ? await PostView.findOne({ postId, userId,    viewedAt: { $gte: since } }).lean()
        : await PostView.findOne({ postId, ipAddress, viewedAt: { $gte: since } }).lean();

    if (alreadyViewed) {
        logger.warn('recordPostView', `Duplicate view skipped for post ID: ${postId} | identifier: ${userId ?? ipAddress ?? 'unknown'}`);
        return null;
    }

    const view = await PostView.create({ postId, userId: userId ?? null, ipAddress, userAgent });

    logger.info('recordPostView', `New view recorded for post ID: ${postId} | identifier: ${userId ?? ipAddress ?? 'anonymous'}`);

    await recalculateTrendingScore(postId);

    return view;
};

/** Returns the total number of views recorded for a given post. */
export const getPostViewCount = async (postId: string): Promise<number> => {
    const count = await PostView.countDocuments({ postId });

    logger.info('getPostViewCount', `Post ID: ${postId} has ${count} total views`);

    return count;
};

/** Recalculates and updates a post's trending score based on views in the last 7 days and total views. */
export const recalculateTrendingScore = async (postId: string): Promise<void> => {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [views7d, totalViews] = await Promise.all([
        PostView.countDocuments({ postId, viewedAt: { $gte: since7d } }),
        PostView.countDocuments({ postId }),
    ]);

    const newScore = (views7d * 2) + totalViews;

    await Post.findByIdAndUpdate(postId, {
        trendingScore: newScore,
        viewsCount:    totalViews,
    });

    logger.info('recalculateTrendingScore', `Post ID: ${postId} | score: ${newScore} (7d views: ${views7d}, total: ${totalViews})`);
};