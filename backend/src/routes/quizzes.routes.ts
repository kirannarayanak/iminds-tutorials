import { Router } from 'express';
import { getQuiz, createOrUpdateQuiz, submitQuiz, getAttempts, getAttemptDetail } from '../controllers/quizzes.controller';
import { authenticate } from '../middleware/auth';
import { isAnyRole, isAdminOrTeacher } from '../middleware/roles';

const router = Router();

router.get('/:id', authenticate, isAnyRole, getQuiz);
router.post('/', authenticate, isAdminOrTeacher, createOrUpdateQuiz);
router.post('/:id/submit', authenticate, isAnyRole, submitQuiz);
router.get('/:id/attempts', authenticate, isAnyRole, getAttempts);
router.get('/attempts/:attemptId', authenticate, isAnyRole, getAttemptDetail);

export default router;
