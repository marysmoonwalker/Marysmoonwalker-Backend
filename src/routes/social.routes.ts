import { Router } from 'express';
import {
    fetchComments, postComment, postReply, updateComment, deleteComment,
    reactToPost, reactToComment, fetchPostReactions,
    toggleBookmarkPost, fetchBookmarks,
    fetchNotifications, readNotification, readAllNotifications, removeNotification,
    search,
} from '../controllers/social.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get   ('/posts/:postId/comments', fetchComments);
router.post  ('/posts/:postId/comments', protect, postComment);
router.post  ('/comments/:id/reply',     protect, postReply);
router.patch ('/comments/:id',           protect, updateComment);
router.delete('/comments/:id',           protect, deleteComment);

router.get  ('/posts/:id/reactions',    fetchPostReactions);
router.post ('/posts/:id/react',        protect, reactToPost);
router.post ('/comments/:id/react',     protect, reactToComment);

router.get  ('/bookmarks',          protect, fetchBookmarks);
router.post ('/bookmarks/:postId',  protect, toggleBookmarkPost);

router.get   ('/notifications',            protect, fetchNotifications);
router.patch ('/notifications/read-all',   protect, readAllNotifications);
router.patch ('/notifications/:id/read',   protect, readNotification);
router.delete('/notifications/:id',        protect, removeNotification);

router.get('/search', search);

export default router;