import { Router } from 'express';
import {
  listNotifications,
  markRead,
  markAllRead,
  getRecommendations,
} from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';
import { isAnyRole } from '../middleware/roles';

const router = Router();

router.get('/', authenticate, isAnyRole, listNotifications);
router.get('/recommendations', authenticate, isAnyRole, getRecommendations);
router.patch('/read-all', authenticate, isAnyRole, markAllRead);
router.patch('/:id/read', authenticate, isAnyRole, markRead);

export default router;
