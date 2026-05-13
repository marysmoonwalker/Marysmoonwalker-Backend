import { Schema, model, Document, Types } from 'mongoose';

// ─────────────────────────────────────────────
//  Forum Category
// ─────────────────────────────────────────────

export interface IForumCategory extends Document {
    label: string;
    slug:  string;
}

const ForumCategorySchema = new Schema<IForumCategory>(
    {
        label: { type: String, required: true, unique: true, trim: true },
        slug:  { type: String, required: true, unique: true, trim: true },
    },
    { timestamps: true },
);

export const ForumCategory = model<IForumCategory>('ForumCategory', ForumCategorySchema);


// ─────────────────────────────────────────────
//  Forum Reply
// ─────────────────────────────────────────────

export interface IForumReply extends Document {
    thread:     Types.ObjectId;
    author:     Types.ObjectId;
    body:       string;
    imageUrl?:  string;
    likes:      Types.ObjectId[];  // array of user IDs who liked
    isDeleted:  boolean;
    createdAt:  Date;
    updatedAt:  Date;
}

const ForumReplySchema = new Schema<IForumReply>(
    {
        thread:    { type: Schema.Types.ObjectId, ref: 'ForumThread', required: true },
        author:    { type: Schema.Types.ObjectId, ref: 'User',        required: true },
        body:      { type: String, required: true, trim: true, maxlength: 5000 },
        imageUrl:  { type: String },
        likes:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

ForumReplySchema.index({ thread: 1, createdAt: 1 });

export const ForumReply = model<IForumReply>('ForumReply', ForumReplySchema);


// ─────────────────────────────────────────────
//  Forum Thread
// ─────────────────────────────────────────────

export interface IForumThread extends Document {
    title:        string;
    excerpt:      string;
    body:         string;
    category:     string;
    author:       Types.ObjectId;
    replyCount:   number;
    viewCount:    number;
    pinned:       boolean;
    hot:          boolean;
    isDeleted:    boolean;
    lastActiveAt: Date;
    createdAt:    Date;
    updatedAt:    Date;
}

const ForumThreadSchema = new Schema<IForumThread>(
    {
        title:       { type: String, required: true, trim: true, maxlength: 200 },
        excerpt:     { type: String, trim: true, maxlength: 300 },
        body:        { type: String, required: true, trim: true },
        category:    {
            type:     String,
            required: true,
            enum:     ['News', 'Rare Media', 'Music Discussion', 'Family', 'Memories', 'Tribute'],
        },
        author:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
        replyCount:   { type: Number, default: 0 },
        viewCount:    { type: Number, default: 0 },
        pinned:       { type: Boolean, default: false },
        hot:          { type: Boolean, default: false },
        isDeleted:    { type: Boolean, default: false },
        lastActiveAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

ForumThreadSchema.index({ category: 1, createdAt: -1 });
ForumThreadSchema.index({ pinned: -1, lastActiveAt: -1 });
ForumThreadSchema.index({ title: 'text', excerpt: 'text' });

export const ForumThread = model<IForumThread>('ForumThread', ForumThreadSchema);