import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export async function enrollStudentInCourse(
  studentId: string,
  courseId: string,
  enrolledBy: string | null = null
): Promise<void> {
  await query(
    `INSERT INTO course_enrollments (id, student_id, course_id, enrolled_by)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (student_id, course_id) DO UPDATE SET is_active = true, enrolled_at = NOW()`,
    [uuidv4(), studentId, courseId, enrolledBy ?? studentId]
  );
}

export async function isStudentEnrolled(studentId: string, courseId: string): Promise<boolean> {
  const { rows } = await query(
    'SELECT id FROM course_enrollments WHERE student_id = $1 AND course_id = $2 AND is_active = true',
    [studentId, courseId]
  );
  return rows.length > 0;
}

export async function hasPaidForCourse(studentId: string, courseId: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT id FROM payments WHERE student_id = $1 AND course_id = $2 AND status = 'paid'`,
    [studentId, courseId]
  );
  return rows.length > 0;
}
