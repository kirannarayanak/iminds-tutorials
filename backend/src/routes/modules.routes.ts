import { Router } from 'express';
import {
  getModule, createModule, updateModuleContent, deleteModule,
  uploadMaterial, upsertVideo, deleteMaterial, uploadMiddleware
} from '../controllers/modules.controller';
import { authenticate } from '../middleware/auth';
import { isAnyRole, isAdminOrTeacher } from '../middleware/roles';

const router = Router();

router.get('/:id', authenticate, isAnyRole, getModule);
router.post('/', authenticate, isAdminOrTeacher, createModule);
router.put('/:id', authenticate, isAdminOrTeacher, updateModuleContent);
router.delete('/:id', authenticate, isAdminOrTeacher, deleteModule);
router.post('/:id/materials', authenticate, isAdminOrTeacher, uploadMiddleware, uploadMaterial);
router.delete('/:moduleId/materials/:materialId', authenticate, isAdminOrTeacher, deleteMaterial);
router.put('/:id/video', authenticate, isAdminOrTeacher, upsertVideo);

export default router;
