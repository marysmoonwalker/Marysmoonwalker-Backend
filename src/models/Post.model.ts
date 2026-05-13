
import { Schema, model, Document, Types, CallbackWithoutResultAndOptionalError } from 'mongoose';
import slugify from 'slugify';

export interface ICategory extends Document {
    name:         string;
    slug:         string;
    description?: string;
    color?:       string;
}

const CategorySchema = new Schema<ICategory>(
    {
        name:        { type: String, required: true, unique: true, trim: true },
        slug:        { type: String, unique: true },
        description: { type: String, trim: true },
        color:       { type: String, default: '#000000' },
    },
    { timestamps: true },
);

CategorySchema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
    if (this.name && (!this.slug || this.isModified('name'))) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

export const Category = model<ICategory>('Category', CategorySchema);


export interface IPostSection {
    type:      'text' | 'image' | 'video' | 'audio';
    content?:  string;
    mediaUrl?: string;
    caption?:  string;
}

export interface IMediaMeta {
    videoId?:       string;
    spotifyId?:     string;
    spotifyType?:   'track' | 'album' | 'playlist';
    episodeNumber?: number;
    trackList?:     { title: string; timestamp: number }[];
}

export interface IPost extends Document {
    title:          string;
    slug:           string;
    excerpt?:       string;
    sections:       IPostSection[];
    type:           'article' | 'video' | 'audio';
    category:       Types.ObjectId;
    thumbnail?:     string;
    readTime:       number;
    mediaUrl?:      string;
    embedType?:     'youtube' | 'spotify' | 'direct';
    duration?:      number;
    mediaMeta?:     IMediaMeta;
    author:         Types.ObjectId;
    tags:           string[];
    status:         'draft' | 'published';
    featured:       boolean;
    pinnedTrending: boolean;
    trendingScore:  number;
    viewsCount:     number;
}

const PostSchema = new Schema<IPost>(
    {
        title:     { type: String, required: true, trim: true },
        slug:      { type: String, unique: true },
        excerpt:   { type: String, trim: true, maxlength: 500 },
        sections: [
            {
                type:     { type: String, enum: ['text', 'image', 'video', 'audio'], required: true },
                content:  { type: String },
                mediaUrl: { type: String },
                caption:  { type: String },
            },
        ],
        type:      { type: String, enum: ['article', 'video', 'audio'], default: 'article' },
        category:  { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        thumbnail: { type: String },
        readTime:  { type: Number, default: 0 },
        mediaUrl:  { type: String },
        embedType: { type: String, enum: ['youtube', 'spotify', 'direct'] },
        duration:  { type: Number, default: 0 },
        mediaMeta: {
            videoId:       { type: String },
            spotifyId:     { type: String },
            spotifyType:   { type: String, enum: ['track', 'album', 'playlist'] },
            episodeNumber: { type: Number },
            trackList: [
                {
                    title:     { type: String },
                    timestamp: { type: Number },
                },
            ],
        },
        author:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
        tags:           [{ type: String }],
        status:         { type: String, enum: ['draft', 'published'], default: 'draft' },
        featured:       { type: Boolean, default: false },
        pinnedTrending: { type: Boolean, default: false },
        trendingScore:  { type: Number, default: 0 },
        viewsCount:     { type: Number, default: 0 },
    },
    { timestamps: true },
);

PostSchema.index({ slug: 1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ title: 'text', excerpt: 'text' });

const calculateReadTime = (sections: IPostSection[]): number => {
    const textContent = sections
        .filter(s => s.type === 'text' && s.content)
        .map(s => s.content!.replace(/<[^>]*>?/gm, ''))
        .join(' ');

    const trimmed = textContent.trim();
    if (!trimmed) return 0;

    const words = trimmed.split(/\s+/).length;
    return Math.ceil(words / 200);
};

const extractYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

const extractSpotifyMeta = (url: string): { spotifyId: string; spotifyType: 'track' | 'album' | 'playlist' } | null => {
    const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return {
        spotifyType: match[1] as 'track' | 'album' | 'playlist',
        spotifyId:   match[2],
    };
};

PostSchema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
    if (this.title && (!this.slug || this.isModified('title'))) {
        this.slug = slugify(this.title, { lower: true, strict: true });
    }

    if (this.sections && this.isModified('sections')) {
        this.readTime = calculateReadTime(this.sections);
    }

    if (this.mediaUrl && this.isModified('mediaUrl')) {
        if (this.embedType === 'youtube') {
            const videoId = extractYoutubeId(this.mediaUrl);
            if (videoId) {
                this.mediaMeta = { ...this.mediaMeta, videoId };
            }
        }

        if (this.embedType === 'spotify') {
            const spotifyMeta = extractSpotifyMeta(this.mediaUrl);
            if (spotifyMeta) {
                this.mediaMeta = { ...this.mediaMeta, ...spotifyMeta };
            }
        }
    }

    next();
});

export const Post = model<IPost>('Post', PostSchema);

//Update the thumnails features for audio.
export interface IPostView extends Document {
    postId:     Types.ObjectId;
    userId?:    Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
    viewedAt:   Date;
}

const PostViewSchema = new Schema<IPostView>(
    {
        postId:    { type: Schema.Types.ObjectId, ref: 'Post', required: true },
        userId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
        ipAddress: { type: String },
        userAgent: { type: String },
        viewedAt:  { type: Date, default: Date.now },
    },
);

PostViewSchema.index({ postId: 1, viewedAt: -1 });
PostViewSchema.index({ userId: 1, viewedAt: -1 });
PostViewSchema.index({ postId: 1, userId: 1 }, { unique: true, sparse: true });
PostViewSchema.index({ postId: 1, ipAddress: 1 }, { unique: true, sparse: true });

export const PostView = model<IPostView>('PostView', PostViewSchema);