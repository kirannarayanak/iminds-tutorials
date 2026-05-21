import { Router } from 'express';
import { login, registerStudent, changePassword, me, refreshAccessToken } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerStudent);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

export default router;
