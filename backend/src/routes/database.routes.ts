import { Router } from 'express';
import {
  listEnrollments,
  getAttendanceSheet,
  markAttendance,
  clearAttendance,
} from '../controllers/database.controller';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

router.get('/enrollments', authenticate, isAdmin, listEnrollments);
router.get('/attendance', authenticate, isAdmin, getAttendanceSheet);
router.post('/attendance', authenticate, isAdmin, markAttendance);
router.delete('/attendance', authenticate, isAdmin, clearAttendance);

export default router;
