import { Router } from 'express';
import {
    listThreads,
    getThread,
    createNewThread,
    removeThread,
    pinThread,
    hotThread,
    addReply,
    removeReply,
    likeReply,
    listUserActivity,
} from '../controllers/forum.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { upload } from '../utils/multer';

const router = Router();

router.get   ('/',    listThreads);
router.post  ('/',    protect, createNewThread);

router.get('/users/:userId/activity', protect, listUserActivity);

router.delete('/replies/:id',       protect, removeReply);
router.patch ('/replies/:id/like',  protect, likeReply);

router.get   ('/:id',      getThread);
router.delete('/:id',      protect, restrictTo('admin'), removeThread);
router.patch ('/:id/pin',  protect, restrictTo('admin'), pinThread);
router.patch ('/:id/hot',  protect, restrictTo('admin'), hotThread);
router.post  ('/:id/replies', protect, upload.single('image'), addReply);

export default router;