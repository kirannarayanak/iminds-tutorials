import { Router } from 'express';
import {
  listCourses, getCourse, createCourse, updateCourse,
  assignTeacher, removeTeacher, enrollStudent, unenrollStudent, enrollSelf, updateSchedules
} from '../controllers/courses.controller';
import { authenticate } from '../middleware/auth';
import { isAdmin, isAdminOrTeacher, isAnyRole } from '../middleware/roles';

const router = Router();

router.get('/', authenticate, isAnyRole, listCourses);
router.get('/:id', authenticate, isAnyRole, getCourse);
router.post('/', authenticate, isAdminOrTeacher, createCourse);
router.put('/:id', authenticate, isAdminOrTeacher, updateCourse);
router.post('/:id/enroll-me', authenticate, isAnyRole, enrollSelf);
router.post('/:id/assign-teacher', authenticate, isAdmin, assignTeacher);
router.delete('/:id/teachers/:teacherId', authenticate, isAdmin, removeTeacher);
router.post('/:id/enroll', authenticate, isAdmin, enrollStudent);
router.delete('/:id/enroll/:studentId', authenticate, isAdmin, unenrollStudent);
router.put('/:id/schedules', authenticate, isAdminOrTeacher, updateSchedules);

export default router;
