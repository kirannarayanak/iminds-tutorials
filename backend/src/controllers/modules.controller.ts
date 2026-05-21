import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { query } from '../config/database';
import { success, error } from '../utils/response';
import { uploadFile, getSignedUrl } from '../services/storage.service';
import { logAudit } from '../middleware/audit';
import { teacherManagesCourse } from '../utils/courseAccess';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
export const uploadMiddleware = upload.single('file');

async function checkCourseAccess(courseId: string, userId: string, role: string): Promise<boolean> {
  if (role === 'admin') return true;
  if (role === 'teacher') {
    return teacherManagesCourse(userId, courseId);
  }
  if (role === 'student') {
    const { rows } = await query(
      'SELECT id FROM course_enrollments WHERE student_id = $1 AND course_id = $2 AND is_active = true',
      [userId, courseId]
    );
    return rows.length > 0;
  }
  return false;
}

export async function getModule(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  const { rows } = await query(
    `SELECT m.*, mtc.content AS text_content FROM modules m
     LEFT JOIN module_text_content mtc ON mtc.module_id = m.id
     WHERE m.id = $1`,
    [id]
  );
  if (!rows.length) return error(res, 'Module not found', 404);
  const mod = rows[0];

  const hasAccess = await checkCourseAccess(mod.course_id, user.userId, user.role);
  if (!hasAccess) return error(res, 'Access denied', 403);

  // Materials with signed URLs
  const { rows: materials } = await query(
    'SELECT * FROM module_materials WHERE module_id = $1 ORDER BY uploaded_at',
    [id]
  );
  const materialsWithUrls = await Promise.all(
    materials.map(async (m: any) => {
      try {
        const url = await getSignedUrl('MATERIALS', m.storage_path, 3600);
        return { ...m, signedUrl: url };
      } catch {
        return { ...m, signedUrl: null };
      }
    })
  );

  // Video
  const { rows: videos } = await query(
    'SELECT * FROM module_videos WHERE module_id = $1',
    [id]
  );

  // Quiz (without answers for students)
  const { rows: quizRows } = await query(
    'SELECT id, title, description, time_limit_mins, pass_marks, max_attempts, is_published FROM quizzes WHERE module_id = $1',
    [id]
  );

  return success(res, {
    ...mod,
    materials: materialsWithUrls,
    video: videos[0] || null,
    quiz: quizRows[0] || null,
  });
}

export async function createModule(req: Request, res: Response) {
  const { courseId, title, description, orderIndex } = req.body;
  if (!courseId || !title) return error(res, 'courseId and title required');

  const user = req.user!;
  const hasAccess = await checkCourseAccess(courseId, user.userId, user.role);
  if (!hasAccess) return error(res, 'Access denied', 403);

  const moduleId = uuidv4();
  await query(
    `INSERT INTO modules (id, course_id, title, description, order_index, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [moduleId, courseId, title, description || null, orderIndex ?? 0, user.userId]
  );

  await logAudit(user.userId, 'create_module', 'module', moduleId, null, req.body, req);
  return success(res, { id: moduleId }, 201, 'Module created');
}

export async function updateModuleContent(req: Request, res: Response) {
  const { id } = req.params;
  const { content, title, description, isPublished } = req.body;
  const user = req.user!;

  const { rows } = await query('SELECT course_id FROM modules WHERE id = $1', [id]);
  if (!rows.length) return error(res, 'Module not found', 404);

  const hasAccess = await checkCourseAccess(rows[0].course_id, user.userId, user.role);
  if (!hasAccess) return error(res, 'Access denied', 403);
  if (user.role === 'student') return error(res, 'Students cannot edit module content', 403);

  // Update module meta
  if (title !== undefined || description !== undefined || isPublished !== undefined) {
    await query(
      `UPDATE modules SET title = COALESCE($1, title), description = COALESCE($2, description),
       is_published = COALESCE($3, is_published) WHERE id = $4`,
      [title, description, isPublished, id]
    );
  }

  // Upsert text content
  if (content !== undefined) {
    await query(
      `INSERT INTO module_text_content (id, module_id, content, updated_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (module_id) DO UPDATE SET content = $3, updated_by = $4, updated_at = NOW()`,
      [uuidv4(), id, content, user.userId]
    );
  }

  await logAudit(user.userId, 'update_module', 'module', id, null, req.body, req);
  return success(res, null, 200, 'Module updated');
}

export async function uploadMaterial(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  if (user.role === 'student') return error(res, 'Students cannot upload materials', 403);
  if (!req.file) return error(res, 'No file uploaded');

  const { rows } = await query('SELECT course_id FROM modules WHERE id = $1', [id]);
  if (!rows.length) return error(res, 'Module not found', 404);

  const hasAccess = await checkCourseAccess(rows[0].course_id, user.userId, user.role);
  if (!hasAccess) return error(res, 'Access denied', 403);

  const ext = req.file.originalname.split('.').pop() || 'bin';
  const storagePath = `modules/${id}/materials/${uuidv4()}.${ext}`;

  const uploadResult = await uploadFile('MATERIALS', storagePath, req.file.buffer, req.file.mimetype);

  const materialId = uuidv4();
  await query(
    `INSERT INTO module_materials (id, module_id, title, file_name, file_type, file_size, storage_path, storage_provider, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [materialId, id, req.body.title || req.file.originalname, req.file.originalname,
     ext, req.file.size, uploadResult.storagePath, uploadResult.provider, user.userId]
  );

  return success(res, { id: materialId, storagePath: uploadResult.storagePath }, 201, 'Material uploaded');
}

export async function upsertVideo(req: Request, res: Response) {
  const { id } = req.params;
  const { title, videoUrl, videoType = 'url' } = req.body;
  const user = req.user!;

  if (user.role === 'student') return error(res, 'Students cannot update videos', 403);

  const { rows } = await query('SELECT course_id FROM modules WHERE id = $1', [id]);
  if (!rows.length) return error(res, 'Module not found', 404);

  const hasAccess = await checkCourseAccess(rows[0].course_id, user.userId, user.role);
  if (!hasAccess) return error(res, 'Access denied', 403);

  await query(
    `INSERT INTO module_videos (id, module_id, title, video_type, video_url, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (module_id) DO UPDATE SET title=$3, video_type=$4, video_url=$5, uploaded_by=$6, updated_at=NOW()`,
    [uuidv4(), id, title || null, videoType, videoUrl || null, user.userId]
  );

  return success(res, null, 200, 'Video updated');
}

export async function deleteMaterial(req: Request, res: Response) {
  const { moduleId, materialId } = req.params;
  const user = req.user!;
  if (user.role === 'student') return error(res, 'Forbidden', 403);

  await query('DELETE FROM module_materials WHERE id = $1 AND module_id = $2', [materialId, moduleId]);
  return success(res, null, 200, 'Material deleted');
}

export async function deleteModule(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  const { rows } = await query('SELECT course_id, title FROM modules WHERE id = $1', [id]);
  if (!rows.length) return error(res, 'Module not found', 404);

  const hasAccess = await checkCourseAccess(rows[0].course_id, user.userId, user.role);
  if (!hasAccess) return error(res, 'Access denied', 403);
  if (user.role === 'student') return error(res, 'Students cannot delete modules', 403);

  await query('DELETE FROM modules WHERE id = $1', [id]);

  await logAudit(user.userId, 'delete_module', 'module', id, { title: rows[0].title }, null, req);
  return success(res, null, 200, 'Module deleted');
}
