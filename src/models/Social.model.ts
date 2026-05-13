import { Schema, model, Document, Types } from 'mongoose';

export interface IComment extends Document {
    postId:    Types.ObjectId;
    userId:    Types.ObjectId;
    body:      string;
    parentId:  Types.ObjectId | null;
    isEdited:  boolean;
    isDeleted: boolean;
}

const CommentSchema = new Schema<IComment>(
    {
        postId:    { type: Schema.Types.ObjectId, ref: 'Post',    required: true },
        userId:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },
        body:      { type: String, required: true, trim: true },
        parentId:  { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
        isEdited:  { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

CommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });
CommentSchema.index({ userId: 1 });

export const Comment = model<IComment>('Comment', CommentSchema);

export type ReactionType = 'like' | 'love' | 'fire' | 'sad' | 'wow';
export type ReactionTarget = 'post' | 'comment';

export interface IReaction extends Document {
    userId:       Types.ObjectId;
    targetId:     Types.ObjectId;
    targetType:   ReactionTarget;
    reactionType: ReactionType;
}

const ReactionSchema = new Schema<IReaction>(
    {
        userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
        targetId:     { type: Schema.Types.ObjectId,              required: true },
        targetType:   { type: String, enum: ['post', 'comment'],  required: true },
        reactionType: { type: String, enum: ['like', 'love', 'fire', 'sad', 'wow'], required: true },
    },
    { timestamps: true },
);

// One reaction per user per target — enforced at DB level
ReactionSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
ReactionSchema.index({ targetId: 1, targetType: 1 });

export const Reaction = model<IReaction>('Reaction', ReactionSchema);


export interface IBookmark extends Document {
    userId: Types.ObjectId;
    postId: Types.ObjectId;
}

const BookmarkSchema = new Schema<IBookmark>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    },
    { timestamps: true },
);

// One bookmark per user per post — enforced at DB level
BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export const Bookmark = model<IBookmark>('Bookmark', BookmarkSchema);


export type NotificationType = 'comment_reply' | 'reaction' | 'mention';

export interface INotification extends Document {
    userId:     Types.ObjectId;
    type:       NotificationType;
    actorId:    Types.ObjectId;
    targetId:   Types.ObjectId;
    targetType: 'post' | 'comment';
    isRead:     boolean;
}

const NotificationSchema = new Schema<INotification>(
    {
        userId:     { type: Schema.Types.ObjectId, ref: 'User',              required: true },
        type:       { type: String, enum: ['comment_reply', 'reaction', 'mention'], required: true },
        actorId:    { type: Schema.Types.ObjectId, ref: 'User',              required: true },
        targetId:   { type: Schema.Types.ObjectId,                           required: true },
        targetType: { type: String, enum: ['post', 'comment'],               required: true },
        isRead:     { type: Boolean, default: false },
    },
    { timestamps: true },
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', NotificationSchema);