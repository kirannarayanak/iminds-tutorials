import { query } from '../config/database';

/** Teacher may manage a course if they created it or are assigned to it. */
export async function teacherManagesCourse(teacherId: string, courseId: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1 FROM courses c
     WHERE c.id = $1
       AND (
         c.created_by = $2
         OR EXISTS (
           SELECT 1 FROM teacher_course_assignments tca
           WHERE tca.course_id = c.id AND tca.teacher_id = $2
         )
       )`,
    [courseId, teacherId]
  );
  return rows.length > 0;
}

export async function getCourseIdForModule(moduleId: string): Promise<string | null> {
  const { rows } = await query<{ course_id: string }>(
    'SELECT course_id FROM modules WHERE id = $1',
    [moduleId]
  );
  return rows[0]?.course_id ?? null;
}
