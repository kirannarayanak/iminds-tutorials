import { Router } from 'express';
import { listUsers, getUser, createUser, updateUser, resetUserPassword, toggleUserStatus, deleteUser } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

router.get('/', authenticate, isAdmin, listUsers);
router.get('/:id', authenticate, isAdmin, getUser);
router.post('/', authenticate, isAdmin, createUser);
router.put('/:id', authenticate, isAdmin, updateUser);
router.post('/:id/reset-password', authenticate, isAdmin, resetUserPassword);
router.patch('/:id/toggle-status', authenticate, isAdmin, toggleUserStatus);
router.delete('/:id', authenticate, isAdmin, deleteUser);

export default router;
