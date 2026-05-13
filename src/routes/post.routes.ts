// import { Router } from 'express';
// import {
//     createCat, getCats, updateCat, removeCat,
//     createPst, fetchPosts, fetchFeatured, fetchTrending,
//     fetchPostBySlug, updatePst, removePst,
//     toggleFeatured, toggleTrendingPin,
// } from '../controllers/post.controller';
// import { protect, restrictTo } from '../middlewares/auth.middleware';
// import { upload } from '../utils/multer';

// const router = Router();

// router.get   ('/categories',     getCats);
// router.post  ('/categories',     protect, restrictTo('admin'), createCat);
// router.patch ('/categories/:id', protect, restrictTo('admin'), updateCat);
// router.delete('/categories/:id', protect, restrictTo('admin'), removeCat);

// router.get('/posts',          fetchPosts);
// router.get('/posts/featured', fetchFeatured);
// router.get('/posts/trending', fetchTrending);
// router.get('/posts/:slug',    fetchPostBySlug);

// router.post(
//     '/posts',
//     protect,
//     restrictTo('admin'),
//     upload.fields([
//         { name: 'thumbnail', maxCount: 1 },
//         { name: 'sectionImages', maxCount: 10 }
//     ]),
//     createPst
// );

// router.patch(
//     '/posts/:id',
//     protect,
//     restrictTo('admin'),
//     upload.fields([
//         { name: 'thumbnail', maxCount: 1 },
//         { name: 'sectionImages', maxCount: 10 }
//     ]),
//     updatePst
// );

// router.delete('/posts/:id',               protect, restrictTo('admin'), removePst);
// router.patch ('/posts/:id/feature',       protect, restrictTo('admin'), toggleFeatured);
// router.patch ('/posts/:id/pin-trending',  protect, restrictTo('admin'), toggleTrendingPin);

// export default router;





















import { Router } from 'express';
import {
    createCat,
    getCats,
    updateCat,
    removeCat,
    createPst,
    fetchPosts,
    fetchSearch,
    fetchFeatured,
    fetchTrending,
    fetchPostBySlug,
    updatePst,
    removePst,
    toggleFeatured,
    toggleTrendingPin,
} from '../controllers/post.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { upload } from '../utils/multer';

const router = Router();

router.get   ('/categories',     getCats);
router.post  ('/categories',     protect, restrictTo('admin'), createCat);
router.patch ('/categories/:id', protect, restrictTo('admin'), updateCat);
router.delete('/categories/:id', protect, restrictTo('admin'), removeCat);

router.get('/posts',          fetchPosts);
router.get('/posts/search',   fetchSearch);
router.get('/posts/featured', fetchFeatured);
router.get('/posts/trending', fetchTrending);
router.get('/posts/:slug',    fetchPostBySlug);

router.post(
    '/posts',
    protect,
    restrictTo('admin'),
    upload.fields([
        { name: 'thumbnail',     maxCount: 1  },
        { name: 'sectionImages', maxCount: 10 },
    ]),
    createPst,
);

router.patch(
    '/posts/:id',
    protect,
    restrictTo('admin'),
    upload.fields([
        { name: 'thumbnail',     maxCount: 1  },
        { name: 'sectionImages', maxCount: 10 },
    ]),
    updatePst,
);

router.delete('/posts/:id',              protect, restrictTo('admin'), removePst);
router.patch ('/posts/:id/feature',      protect, restrictTo('admin'), toggleFeatured);
router.patch ('/posts/:id/pin-trending', protect, restrictTo('admin'), toggleTrendingPin);

export default router;