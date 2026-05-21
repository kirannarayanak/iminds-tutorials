import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import userRoutes from './users.routes';
import courseRoutes from './courses.routes';
import moduleRoutes from './modules.routes';
import quizRoutes from './quizzes.routes';
import paymentRoutes from './payments.routes';
import notificationRoutes from './notifications.routes';
import databaseRoutes from './database.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/modules', moduleRoutes);
router.use('/quizzes', quizRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/database', databaseRoutes);

export default router;
