import { Router } from 'express';
import { adminDashboard, teacherDashboard, studentDashboard } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { isAdmin, isTeacher, isAnyRole } from '../middleware/roles';

const router = Router();

router.get('/admin', authenticate, isAdmin, adminDashboard);
router.get('/teacher', authenticate, isTeacher, teacherDashboard);
router.get('/student', authenticate, isAnyRole, studentDashboard);

export default router;
