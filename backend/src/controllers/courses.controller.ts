import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { success, error } from '../utils/response';
import { logAudit } from '../middleware/audit';
import { teacherManagesCourse } from '../utils/courseAccess';
import { enrollStudentInCourse, isStudentEnrolled } from '../utils/enrollment';
import { notifyStudentsOfNewCourse } from '../services/notification.service';

export async function listCourses(req: Request, res: Response) {
  const user = req.user!;
  let sql: string;
  let params: any[];

  if (user.role === 'student') {
    // Catalog with creator, instructors, and module outline
    sql = `
      SELECT c.*,
             array_agg(DISTINCT cs.day_of_week) FILTER (WHERE cs.day_of_week IS NOT NULL) AS schedule_days,
             EXISTS (
               SELECT 1 FROM course_enrollments ce
               WHERE ce.course_id = c.id AND ce.student_id = $1 AND ce.is_active = true
             ) AS is_enrolled,
             EXISTS (
               SELECT 1 FROM payments p
               WHERE p.course_id = c.id AND p.student_id = $1 AND p.status = 'pending'
             ) AS has_pending_payment,
             CASE WHEN cr.id IS NOT NULL THEN json_build_object(
               'id', cr.id,
               'first_name', cr.first_name,
               'last_name', cr.last_name,
               'role', rr.name
             ) ELSE NULL END AS creator,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id', tu.id,
                 'first_name', tu.first_name,
                 'last_name', tu.last_name
               ) ORDER BY tu.first_name, tu.last_name)
               FROM teacher_course_assignments tca2
               JOIN users tu ON tu.id = tca2.teacher_id
               WHERE tca2.course_id = c.id),
               '[]'::json
             ) AS teachers,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id', m.id,
                 'title', m.title,
                 'description', m.description,
                 'order_index', m.order_index,
                 'is_published', m.is_published,
                 'materials_count', (SELECT COUNT(*)::int FROM module_materials mm WHERE mm.module_id = m.id),
                 'quiz_count', (SELECT COUNT(*)::int FROM quizzes q WHERE q.module_id = m.id AND q.is_published = true)
               ) ORDER BY m.order_index)
               FROM modules m WHERE m.course_id = c.id),
               '[]'::json
             ) AS modules
      FROM courses c
      LEFT JOIN class_schedules cs ON cs.course_id = c.id
      LEFT JOIN users cr ON cr.id = c.created_by
      LEFT JOIN roles rr ON rr.id = cr.role_id
      WHERE c.is_active = true
      GROUP BY c.id, cr.id, cr.first_name, cr.last_name, rr.name
      ORDER BY c.name
    `;
    params = [user.userId];
  } else if (user.role === 'teacher') {
    // Courses the teacher created or is assigned to
    sql = `
      SELECT c.*,
             array_agg(DISTINCT cs.day_of_week) FILTER (WHERE cs.day_of_week IS NOT NULL) AS schedule_days,
             COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.is_active = true) AS enrolled_count
      FROM courses c
      LEFT JOIN class_schedules cs ON cs.course_id = c.id
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id
      LEFT JOIN teacher_course_assignments tca ON tca.course_id = c.id AND tca.teacher_id = $1
      WHERE c.is_active = true AND (c.created_by = $1 OR tca.teacher_id IS NOT NULL)
      GROUP BY c.id ORDER BY c.created_at DESC
    `;
    params = [user.userId];
  } else {
    // Admin sees all
    sql = `
      SELECT c.*,
             array_agg(DISTINCT cs.day_of_week) FILTER (WHERE cs.day_of_week IS NOT NULL) AS schedule_days,
             COUNT(DISTINCT ce.student_id) AS enrolled_count
      FROM courses c
      LEFT JOIN class_schedules cs ON cs.course_id = c.id
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id AND ce.is_active = true
      GROUP BY c.id ORDER BY c.created_at DESC
    `;
    params = [];
  }

  const { rows } = await query(sql, params);
  return success(res, rows);
}

async function loadCourseCreator(createdBy: string | null) {
  if (!createdBy) return null;
  const { rows } = await query(
    `SELECT u.id, u.first_name, u.last_name, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [createdBy]
  );
  return rows[0] || null;
}

async function loadCourseTeachers(courseId: string) {
  const { rows } = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            tp.qualification, tp.experience_years
     FROM users u
     JOIN teacher_course_assignments tca ON tca.teacher_id = u.id
     LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
     WHERE tca.course_id = $1
     ORDER BY u.first_name, u.last_name`,
    [courseId]
  );
  return rows;
}

async function loadCourseModulesOutline(courseId: string, publishedOnly = false) {
  const pubFilter = publishedOnly ? 'AND m.is_published = true' : '';
  const { rows } = await query(
    `SELECT m.id, m.title, m.description, m.order_index, m.is_published,
            (SELECT COUNT(*) FROM module_materials mm WHERE mm.module_id = m.id) AS materials_count,
            (SELECT COUNT(*) FROM quizzes q WHERE q.module_id = m.id AND q.is_published = true) AS quiz_count
     FROM modules m
     WHERE m.course_id = $1 ${pubFilter}
     ORDER BY m.order_index`,
    [courseId]
  );
  return rows;
}

export async function getCourse(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  let studentEnrolled = false;
  if (user.role === 'student') {
    studentEnrolled = await isStudentEnrolled(user.userId, id);
  } else if (user.role === 'teacher') {
    const ok = await teacherManagesCourse(user.userId, id);
    if (!ok) return error(res, 'You do not have access to this course', 403);
  }

  const { rows: courseRows } = await query('SELECT * FROM courses WHERE id = $1', [id]);
  if (!courseRows.length) return error(res, 'Course not found', 404);

  const course = courseRows[0];

  // Schedules
  const { rows: schedules } = await query(
    'SELECT * FROM class_schedules WHERE course_id = $1 ORDER BY day_of_week',
    [id]
  );

  const creator = await loadCourseCreator(course.created_by);
  const teachers = await loadCourseTeachers(id);

  // Student preview (not enrolled): outline only, no lesson content
  if (user.role === 'student' && !studentEnrolled) {
    const modules = await loadCourseModulesOutline(id, false);
    const { rows: pending } = await query(
      `SELECT id FROM payments WHERE student_id = $1 AND course_id = $2 AND status = 'pending' LIMIT 1`,
      [user.userId, id]
    );
    return success(res, {
      ...course,
      schedules,
      modules,
      teachers,
      creator,
      is_enrolled: false,
      preview: true,
      has_pending_payment: pending.length > 0,
    });
  }

  // Full access: enrolled student, teacher, or admin
  const { rows: modules } = await query(
    `SELECT m.*, mtc.content AS text_content,
            (SELECT COUNT(*) FROM quizzes q WHERE q.module_id = m.id AND q.is_published = true) AS quiz_count,
            (SELECT COUNT(*) FROM module_materials mm WHERE mm.module_id = m.id) AS materials_count
     FROM modules m
     LEFT JOIN module_text_content mtc ON mtc.module_id = m.id
     WHERE m.course_id = $1
     ORDER BY m.order_index`,
    [id]
  );

  let enrolledStudents: any[] = [];
  if (user.role === 'admin') {
    const { rows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.username, u.email,
              sp.grade, ce.enrolled_at, ce.is_active
       FROM users u
       JOIN course_enrollments ce ON ce.student_id = u.id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE ce.course_id = $1 AND ce.is_active = true
       ORDER BY u.first_name, u.last_name`,
      [id]
    );
    enrolledStudents = rows;
  }

  return success(res, {
    ...course,
    schedules,
    modules,
    teachers,
    creator,
    enrolledStudents,
    is_enrolled: user.role === 'student' ? true : undefined,
    preview: false,
  });
}

export async function createCourse(req: Request, res: Response) {
  const { name, description, grade, price, currency, schedules = [] } = req.body;
  if (!name) return error(res, 'Course name is required');

  const courseId = uuidv4();
  await query(
    `INSERT INTO courses (id, name, description, grade, price, currency, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [courseId, name, description, grade, price || 0, currency || 'AED', req.user!.userId]
  );

  // Insert schedules
  for (const s of schedules) {
    await query(
      'INSERT INTO class_schedules (id, course_id, day_of_week, start_time, end_time) VALUES ($1,$2,$3,$4,$5)',
      [uuidv4(), courseId, s.dayOfWeek, s.startTime, s.endTime]
    );
  }

  // Teacher who creates a course is auto-assigned as its instructor
  if (req.user!.role === 'teacher') {
    await query(
      `INSERT INTO teacher_course_assignments (id, teacher_id, course_id, assigned_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (teacher_id, course_id) DO NOTHING`,
      [uuidv4(), req.user!.userId, courseId, req.user!.userId]
    );
  }

  await logAudit(req.user!.userId, 'create_course', 'course', courseId, null, req.body, req);

  try {
    const { rows: creator } = await query(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [req.user!.userId]
    );
    const creatorName = creator.length
      ? `${creator[0].first_name} ${creator[0].last_name}`
      : 'iMinds';
    await notifyStudentsOfNewCourse({
      id: courseId,
      name,
      description,
      price: Number(price) || 0,
      currency: currency || 'AED',
      creatorName,
    });
  } catch (err) {
    console.error('Failed to notify students of new course:', err);
  }

  return success(res, { id: courseId }, 201, 'Course created');
}

export async function updateCourse(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description, grade, price, currency, isActive } = req.body;
  const user = req.user!;

  const { rows } = await query('SELECT id FROM courses WHERE id = $1', [id]);
  if (!rows.length) return error(res, 'Course not found', 404);

  if (user.role === 'teacher') {
    const ok = await teacherManagesCourse(user.userId, id);
    if (!ok) return error(res, 'You do not have access to this course', 403);
  }

  await query(
    `UPDATE courses SET
       name = COALESCE($1, name), description = COALESCE($2, description),
       grade = COALESCE($3, grade), price = COALESCE($4, price),
       currency = COALESCE($5, currency), is_active = COALESCE($6, is_active)
     WHERE id = $7`,
    [name, description, grade, price, currency, isActive, id]
  );
  await logAudit(req.user!.userId, 'update_course', 'course', id, null, req.body, req);
  return success(res, null, 200, 'Course updated');
}

export async function assignTeacher(req: Request, res: Response) {
  const { id } = req.params;
  const { teacherId } = req.body;
  if (!teacherId) return error(res, 'teacherId required');

  await query(
    `INSERT INTO teacher_course_assignments (id, teacher_id, course_id, assigned_by)
     VALUES ($1,$2,$3,$4) ON CONFLICT (teacher_id, course_id) DO NOTHING`,
    [uuidv4(), teacherId, id, req.user!.userId]
  );
  await logAudit(req.user!.userId, 'assign_teacher', 'course', id, null, { teacherId }, req);
  return success(res, null, 200, 'Teacher assigned');
}

export async function removeTeacher(req: Request, res: Response) {
  const { id, teacherId } = req.params;

  const { rowCount } = await query(
    'DELETE FROM teacher_course_assignments WHERE course_id = $1 AND teacher_id = $2',
    [id, teacherId]
  );
  if (!rowCount) return error(res, 'Teacher is not assigned to this course', 404);

  await logAudit(req.user!.userId, 'remove_teacher', 'course', id, null, { teacherId }, req);
  return success(res, null, 200, 'Teacher removed from course');
}

export async function enrollStudent(req: Request, res: Response) {
  const { id } = req.params;
  const { studentId } = req.body;
  if (!studentId) return error(res, 'studentId required');

  await query(
    `INSERT INTO course_enrollments (id, student_id, course_id, enrolled_by)
     VALUES ($1,$2,$3,$4) ON CONFLICT (student_id, course_id) DO NOTHING`,
    [uuidv4(), studentId, id, req.user!.userId]
  );
  return success(res, null, 200, 'Student enrolled');
}

export async function unenrollStudent(req: Request, res: Response) {
  const { id, studentId } = req.params;
  await query(
    'UPDATE course_enrollments SET is_active = false WHERE student_id = $1 AND course_id = $2',
    [studentId, id]
  );
  return success(res, null, 200, 'Student unenrolled');
}

/** @deprecated Use POST /payments/initiate then /payments/confirm. Only allows free (price = 0) courses. */
export async function enrollSelf(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  if (user.role !== 'student') return error(res, 'Only students can enroll themselves', 403);

  const { rows: course } = await query('SELECT id, is_active, price FROM courses WHERE id = $1', [id]);
  if (!course.length) return error(res, 'Course not found', 404);
  if (!course[0].is_active) return error(res, 'This course is not available', 400);

  if (Number(course[0].price) > 0) {
    return error(res, 'Please complete payment before enrolling. Use Pay & Enroll on the course.', 402);
  }

  if (await isStudentEnrolled(user.userId, id)) {
    return success(res, null, 200, 'Already enrolled');
  }

  await enrollStudentInCourse(user.userId, id, user.userId);
  return success(res, null, 200, 'Enrolled successfully');
}

export async function updateSchedules(req: Request, res: Response) {
  const { id } = req.params;
  const { schedules = [] } = req.body;
  const user = req.user!;

  if (user.role === 'teacher') {
    const ok = await teacherManagesCourse(user.userId, id);
    if (!ok) return error(res, 'You do not have access to this course', 403);
  }

  await query('DELETE FROM class_schedules WHERE course_id = $1', [id]);
  for (const s of schedules) {
    await query(
      'INSERT INTO class_schedules (id, course_id, day_of_week, start_time, end_time, notes) VALUES ($1,$2,$3,$4,$5,$6)',
      [uuidv4(), id, s.dayOfWeek, s.startTime, s.endTime, s.notes || null]
    );
  }
  return success(res, null, 200, 'Schedules updated');
}
