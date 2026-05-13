import { Router } from 'express';
import {
    fetchOverview,
    fetchViewsChart,
    fetchUserGrowth,
    fetchContentBreakdown,
    fetchTopPosts,
    fetchForumStats,
    fetchAllUsers,
    deleteUser,
    updateUserRole,
} from '../controllers/analytics.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/analytics/overview',         fetchOverview);
router.get('/analytics/views',            fetchViewsChart);
router.get('/analytics/user-growth',      fetchUserGrowth);
router.get('/analytics/content',          fetchContentBreakdown);
router.get('/analytics/top-posts',        fetchTopPosts);
router.get('/analytics/forum',            fetchForumStats);

router.get('/users',                      fetchAllUsers);
router.delete('/users/:id',               deleteUser);
router.patch('/users/:id/role',           updateUserRole);

export default router;