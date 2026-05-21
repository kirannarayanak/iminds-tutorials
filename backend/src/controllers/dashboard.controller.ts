import { Request, Response } from 'express';
import { query } from '../config/database';
import { success } from '../utils/response';

export async function adminDashboard(req: Request, res: Response) {
  const [students, teachers, courses, quizStats, paymentStats, recentActivity] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'student' AND u.is_active = true`),
    query(`SELECT COUNT(*) AS count FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'teacher' AND u.is_active = true`),
    query(`SELECT COUNT(*) AS count, COUNT(*) FILTER (WHERE is_active) AS active_count FROM courses`),
    query(`
      SELECT
        COUNT(*) AS total_attempts,
        ROUND(AVG(score / NULLIF(max_score,0) * 100), 1) AS avg_score_pct,
        COUNT(*) FILTER (WHERE is_passed) AS passed_count
      FROM quiz_attempts WHERE status = 'submitted'
    `),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_revenue
      FROM payments
    `),
    query(`
      SELECT u.first_name, u.last_name, u.username, qa.submitted_at, q.title AS quiz_title, qa.score, qa.max_score
      FROM quiz_attempts qa
      JOIN users u ON u.id = qa.student_id
      JOIN quizzes q ON q.id = qa.quiz_id
      WHERE qa.status = 'submitted'
      ORDER BY qa.submitted_at DESC LIMIT 10
    `),
  ]);

  // Avg score per course
  const { rows: courseScores } = await query(`
    SELECT c.name AS course_name,
           ROUND(AVG(qa.score / NULLIF(qa.max_score,0) * 100), 1) AS avg_score_pct,
           COUNT(qa.id) AS attempt_count
    FROM courses c
    JOIN modules m ON m.course_id = c.id
    JOIN quizzes qz ON qz.module_id = m.id
    JOIN quiz_attempts qa ON qa.quiz_id = qz.id AND qa.status = 'submitted'
    GROUP BY c.id, c.name ORDER BY avg_score_pct DESC
  `);

  return success(res, {
    totalStudents: parseInt(students.rows[0].count),
    totalTeachers: parseInt(teachers.rows[0].count),
    totalCourses: parseInt(courses.rows[0].count),
    activeCourses: parseInt(courses.rows[0].active_count),
    quizStats: quizStats.rows[0],
    paymentStats: paymentStats.rows[0],
    recentActivity: recentActivity.rows,
    courseScores,
  });
}

export async function teacherDashboard(req: Request, res: Response) {
  const teacherId = req.user!.userId;

  const [assignedCourses, upcomingClasses, recentAttempts, weakStudents] = await Promise.all([
    query(`
      SELECT c.id, c.name, COUNT(DISTINCT ce.student_id) AS student_count
      FROM courses c
      JOIN teacher_course_assignments tca ON tca.course_id = c.id AND tca.teacher_id = $1
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id AND ce.is_active = true
      GROUP BY c.id, c.name
    `, [teacherId]),
    query(`
      SELECT cs.day_of_week, cs.start_time, cs.end_time, c.name AS course_name
      FROM class_schedules cs JOIN courses c ON c.id = cs.course_id
      JOIN teacher_course_assignments tca ON tca.course_id = c.id AND tca.teacher_id = $1
      ORDER BY cs.day_of_week, cs.start_time LIMIT 10
    `, [teacherId]),
    query(`
      SELECT qa.id, qa.score, qa.max_score, qa.submitted_at, qa.is_passed,
             u.first_name, u.last_name, qz.title AS quiz_title
      FROM quiz_attempts qa
      JOIN users u ON u.id = qa.student_id
      JOIN quizzes qz ON qz.id = qa.quiz_id
      JOIN modules m ON m.id = qz.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN teacher_course_assignments tca ON tca.course_id = c.id AND tca.teacher_id = $1
      WHERE qa.status = 'submitted'
      ORDER BY qa.submitted_at DESC LIMIT 10
    `, [teacherId]),
    query(`
      SELECT u.id, u.first_name, u.last_name, u.username,
             ROUND(AVG(qa.score / NULLIF(qa.max_score,0) * 100), 1) AS avg_score_pct,
             COUNT(qa.id) AS attempt_count
      FROM users u
      JOIN quiz_attempts qa ON qa.student_id = u.id AND qa.status = 'submitted'
      JOIN quizzes qz ON qz.id = qa.quiz_id
      JOIN modules m ON m.id = qz.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN teacher_course_assignments tca ON tca.course_id = c.id AND tca.teacher_id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.username
      HAVING ROUND(AVG(qa.score / NULLIF(qa.max_score,0) * 100), 1) < 50
      ORDER BY avg_score_pct LIMIT 10
    `, [teacherId]),
  ]);

  return success(res, {
    assignedCourses: assignedCourses.rows,
    upcomingClasses: upcomingClasses.rows,
    recentAttempts: recentAttempts.rows,
    weakStudents: weakStudents.rows,
  });
}

export async function studentDashboard(req: Request, res: Response) {
  const studentId = req.user!.userId;

  const [enrolledCourses, pendingQuizzes, completedQuizzes, paymentStatus, upcomingClasses] = await Promise.all([
    query(`
      SELECT c.id, c.name, c.description,
             COUNT(DISTINCT m.id) AS module_count
      FROM courses c
      JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1 AND ce.is_active = true
      LEFT JOIN modules m ON m.course_id = c.id AND m.is_published = true
      GROUP BY c.id, c.name, c.description
    `, [studentId]),
    query(`
      SELECT qz.id, qz.title, m.title AS module_title, c.name AS course_name
      FROM quizzes qz
      JOIN modules m ON m.id = qz.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1 AND ce.is_active = true
      WHERE qz.is_published = true
        AND NOT EXISTS (
          SELECT 1 FROM quiz_attempts qa WHERE qa.quiz_id = qz.id AND qa.student_id = $1 AND qa.status = 'submitted'
        )
      ORDER BY m.order_index LIMIT 20
    `, [studentId]),
    query(`
      SELECT qa.id, qa.score, qa.max_score, qa.is_passed, qa.submitted_at, qz.title AS quiz_title, c.name AS course_name
      FROM quiz_attempts qa
      JOIN quizzes qz ON qz.id = qa.quiz_id
      JOIN modules m ON m.id = qz.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE qa.student_id = $1 AND qa.status = 'submitted'
      ORDER BY qa.submitted_at DESC LIMIT 10
    `, [studentId]),
    query(`
      SELECT p.status, p.amount, p.currency, c.name AS course_name, p.paid_at
      FROM payments p JOIN courses c ON c.id = p.course_id
      WHERE p.student_id = $1 ORDER BY p.created_at DESC
    `, [studentId]),
    query(`
      SELECT cs.day_of_week, cs.start_time, cs.end_time, c.name AS course_name
      FROM class_schedules cs JOIN courses c ON c.id = cs.course_id
      JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1 AND ce.is_active = true
      ORDER BY cs.day_of_week, cs.start_time
    `, [studentId]),
  ]);

  return success(res, {
    enrolledCourses: enrolledCourses.rows,
    pendingQuizzes: pendingQuizzes.rows,
    completedQuizzes: completedQuizzes.rows,
    paymentStatus: paymentStatus.rows,
    upcomingClasses: upcomingClasses.rows,
  });
}
