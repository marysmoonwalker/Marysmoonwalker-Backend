import { Router } from 'express';
import {
    handleSubscribe,
    handleUnsubscribe,
    handleContact,
    listSubscribers,
    listContactMessages,
    markContactMessageRead,
} from '../controllers/outreach.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.post('/subscribe', handleSubscribe);
router.get ('/unsubscribe/:token', handleUnsubscribe);
router.post('/contact', handleContact);

router.get  ('/admin/subscribers', protect, restrictTo('admin'), listSubscribers);
router.get  ('/admin/contact-messages', protect, restrictTo('admin'), listContactMessages);
router.patch('/admin/contact-messages/:id/read', protect, restrictTo('admin'), markContactMessageRead);

export default router;