import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { success, error } from '../utils/response';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function parseDateParam(value?: string): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  return value;
}

function dayOfWeekFromDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return DAY_NAMES[d.getDay()];
}

/** All active enrollments with payment status */
export async function listEnrollments(req: Request, res: Response) {
  const { courseId, search, paymentStatus } = req.query;

  let sql = `
    SELECT
      ce.id AS enrollment_id,
      ce.enrolled_at,
      ce.is_active,
      u.id AS student_id,
      u.first_name,
      u.last_name,
      u.email,
      u.username,
      u.mobile,
      sp.grade,
      c.id AS course_id,
      c.name AS course_name,
      c.price AS course_price,
      c.currency,
      CASE
        WHEN COALESCE(c.price, 0) <= 0 THEN 'free'
        WHEN EXISTS (
          SELECT 1 FROM payments p
          WHERE p.student_id = ce.student_id AND p.course_id = ce.course_id AND p.status = 'paid'
        ) THEN 'paid'
        WHEN EXISTS (
          SELECT 1 FROM payments p
          WHERE p.student_id = ce.student_id AND p.course_id = ce.course_id AND p.status = 'pending'
        ) THEN 'pending'
        ELSE 'unpaid'
      END AS payment_status,
      (
        SELECT p.amount FROM payments p
        WHERE p.student_id = ce.student_id AND p.course_id = ce.course_id AND p.status = 'paid'
        ORDER BY p.paid_at DESC NULLS LAST, p.created_at DESC LIMIT 1
      ) AS paid_amount,
      (
        SELECT p.paid_at FROM payments p
        WHERE p.student_id = ce.student_id AND p.course_id = ce.course_id AND p.status = 'paid'
        ORDER BY p.paid_at DESC NULLS LAST LIMIT 1
      ) AS paid_at
    FROM course_enrollments ce
    JOIN users u ON u.id = ce.student_id
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    JOIN courses c ON c.id = ce.course_id
    WHERE ce.is_active = true
  `;
  const params: any[] = [];

  if (courseId) {
    params.push(courseId);
    sql += ` AND c.id = $${params.length}`;
  }
  if (search) {
    params.push(`%${String(search).toLowerCase()}%`);
    sql += ` AND (
      LOWER(u.first_name) LIKE $${params.length}
      OR LOWER(u.last_name) LIKE $${params.length}
      OR LOWER(u.email) LIKE $${params.length}
      OR LOWER(u.username) LIKE $${params.length}
    )`;
  }
  if (paymentStatus) {
    params.push(paymentStatus);
    sql += ` AND (
      CASE
        WHEN COALESCE(c.price, 0) <= 0 THEN 'free'
        WHEN EXISTS (
          SELECT 1 FROM payments p
          WHERE p.student_id = ce.student_id AND p.course_id = ce.course_id AND p.status = 'paid'
        ) THEN 'paid'
        WHEN EXISTS (
          SELECT 1 FROM payments p
          WHERE p.student_id = ce.student_id AND p.course_id = ce.course_id AND p.status = 'pending'
        ) THEN 'pending'
        ELSE 'unpaid'
      END
    ) = $${params.length}`;
  }

  sql += ` ORDER BY c.name, u.last_name, u.first_name`;

  const { rows } = await query(sql, params);

  const summary = {
    total: rows.length,
    paid: rows.filter((r: any) => r.payment_status === 'paid' || r.payment_status === 'free').length,
    pending: rows.filter((r: any) => r.payment_status === 'pending').length,
    unpaid: rows.filter((r: any) => r.payment_status === 'unpaid').length,
  };

  return success(res, { items: rows, summary });
}

/** Courses scheduled on a date + enrolled students + attendance marks */
export async function getAttendanceSheet(req: Request, res: Response) {
  try {
  let dateStr: string;
  try {
    dateStr = parseDateParam(req.query.date as string);
  } catch (e: any) {
    return error(res, e.message, 400);
  }

  const { courseId } = req.query;
  const dayName = dayOfWeekFromDate(dateStr);

  let coursesSql = `
    SELECT c.id, c.name,
      COALESCE(json_agg(json_build_object(
        'id', cs.id,
        'day_of_week', cs.day_of_week,
        'start_time', cs.start_time,
        'end_time', cs.end_time
      ) ORDER BY cs.start_time) FILTER (WHERE cs.id IS NOT NULL), '[]'::json) AS schedules
    FROM courses c
    JOIN class_schedules cs ON cs.course_id = c.id
    WHERE c.is_active = true AND cs.day_of_week = $1
  `;
  const courseParams: any[] = [dayName];

  if (courseId) {
    courseParams.push(courseId);
    coursesSql += ` AND c.id = $${courseParams.length}`;
  }
  coursesSql += ` GROUP BY c.id, c.name ORDER BY c.name`;

  const { rows: scheduledCourses } = await query(coursesSql, courseParams);

  // If no class scheduled today but courseId filter, still load that course
  if (!scheduledCourses.length && courseId) {
    const { rows: one } = await query(
      `SELECT id, name FROM courses WHERE id = $1 AND is_active = true`,
      [courseId]
    );
    if (one.length) {
      scheduledCourses.push({ ...one[0], schedules: [] });
    }
  }

  const courses = [];

  for (const course of scheduledCourses) {
    const { rows: students } = await query(
      `SELECT
         u.id AS student_id,
         u.first_name,
         u.last_name,
         u.email,
         sp.grade,
         ce.enrolled_at,
         ca.status AS attendance_status,
         ca.marked_at AS attendance_marked_at,
         ca.notes AS attendance_notes,
         marker.first_name AS marked_by_first_name,
         marker.last_name AS marked_by_last_name
       FROM course_enrollments ce
       JOIN users u ON u.id = ce.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN class_attendance ca
         ON ca.student_id = ce.student_id
        AND ca.course_id = ce.course_id
        AND ca.attendance_date = $2::date
       LEFT JOIN users marker ON marker.id = ca.marked_by
       WHERE ce.course_id = $1 AND ce.is_active = true
       ORDER BY u.last_name, u.first_name`,
      [course.id, dateStr]
    );

    courses.push({
      id: course.id,
      name: course.name,
      schedules: course.schedules || [],
      students,
      presentCount: students.filter((s: any) => s.attendance_status === 'present').length,
      totalEnrolled: students.length,
    });
  }

  const { rows: attendedToday } = await query(
    `SELECT
       ca.id,
       ca.status,
       ca.attendance_date,
       ca.marked_at,
       u.first_name,
       u.last_name,
       u.email,
       c.name AS course_name,
       c.id AS course_id
     FROM class_attendance ca
     JOIN users u ON u.id = ca.student_id
     JOIN courses c ON c.id = ca.course_id
     WHERE ca.attendance_date = $1::date
       AND ca.status = 'present'
     ORDER BY ca.marked_at DESC`,
    [dateStr]
  );

  return success(res, {
    date: dateStr,
    dayOfWeek: dayName,
    courses,
    attendedToday,
    hasScheduledClasses: scheduledCourses.length > 0,
  });
  } catch (err: any) {
    console.error('getAttendanceSheet error:', err);
    return error(res, err.message || 'Failed to load attendance', 500);
  }
}

/** Mark or update attendance for a student on a course/date */
export async function markAttendance(req: Request, res: Response) {
  const { studentId, courseId, date, status = 'present', notes } = req.body;

  if (!studentId || !courseId) {
    return error(res, 'studentId and courseId are required');
  }

  let dateStr: string;
  try {
    dateStr = parseDateParam(date);
  } catch (e: any) {
    return error(res, e.message, 400);
  }

  const allowed = ['present', 'absent', 'late'];
  if (!allowed.includes(status)) {
    return error(res, `status must be one of: ${allowed.join(', ')}`);
  }

  const { rows: enrollment } = await query(
    `SELECT id FROM course_enrollments
     WHERE student_id = $1 AND course_id = $2 AND is_active = true`,
    [studentId, courseId]
  );
  if (!enrollment.length) {
    return error(res, 'Student is not enrolled in this course', 400);
  }

  const { rows: existing } = await query(
    `SELECT id FROM class_attendance
     WHERE student_id = $1 AND course_id = $2 AND attendance_date = $3::date`,
    [studentId, courseId, dateStr]
  );

  if (existing.length) {
    await query(
      `UPDATE class_attendance
       SET status = $1, notes = $2, marked_by = $3, marked_at = NOW()
       WHERE id = $4`,
      [status, notes || null, req.user!.userId, existing[0].id]
    );
    return success(res, { id: existing[0].id, updated: true }, 200, 'Attendance updated');
  }

  const id = uuidv4();
  await query(
    `INSERT INTO class_attendance (id, student_id, course_id, attendance_date, status, notes, marked_by)
     VALUES ($1,$2,$3,$4::date,$5,$6,$7)`,
    [id, studentId, courseId, dateStr, status, notes || null, req.user!.userId]
  );

  return success(res, { id, created: true }, 201, 'Attendance recorded');
}

/** Remove attendance mark for a student */
export async function clearAttendance(req: Request, res: Response) {
  const { studentId, courseId, date } = req.body;
  if (!studentId || !courseId) return error(res, 'studentId and courseId are required');

  let dateStr: string;
  try {
    dateStr = parseDateParam(date);
  } catch (e: any) {
    return error(res, e.message, 400);
  }

  await query(
    `DELETE FROM class_attendance
     WHERE student_id = $1 AND course_id = $2 AND attendance_date = $3::date`,
    [studentId, courseId, dateStr]
  );

  return success(res, null, 200, 'Attendance cleared');
}
