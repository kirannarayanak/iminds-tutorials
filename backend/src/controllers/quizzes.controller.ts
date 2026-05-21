import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { success, error } from '../utils/response';
import { logAudit } from '../middleware/audit';
import { teacherManagesCourse, getCourseIdForModule } from '../utils/courseAccess';

async function checkQuizAccess(quizId: string, userId: string, role: string) {
  const { rows } = await query(
    `SELECT q.id, q.module_id, m.course_id FROM quizzes q JOIN modules m ON m.id = q.module_id WHERE q.id = $1`,
    [quizId]
  );
  if (!rows.length) return null;
  const { course_id } = rows[0];

  if (role === 'admin') return rows[0];
  if (role === 'teacher') {
    const ok = await teacherManagesCourse(userId, course_id);
    return ok ? rows[0] : null;
  }
  if (role === 'student') {
    const { rows: e } = await query(
      'SELECT id FROM course_enrollments WHERE student_id = $1 AND course_id = $2 AND is_active = true',
      [userId, course_id]
    );
    return e.length ? rows[0] : null;
  }
  return null;
}

export async function getQuiz(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  const access = await checkQuizAccess(id, user.userId, user.role);
  if (!access) return error(res, 'Quiz not found or access denied', 404);

  const { rows: quiz } = await query('SELECT * FROM quizzes WHERE id = $1', [id]);
  if (!quiz.length) return error(res, 'Quiz not found', 404);

  const { rows: questions } = await query(
    `SELECT q.id, q.question_text, q.explanation, q.marks, q.order_index,
            json_agg(json_build_object(
              'id', o.id, 'label', o.option_label, 'text', o.option_text,
              'isCorrect', CASE WHEN $2 = 'student' THEN NULL ELSE o.is_correct END,
              'orderIndex', o.order_index
            ) ORDER BY o.order_index) AS options
     FROM quiz_questions q
     LEFT JOIN quiz_options o ON o.question_id = q.id
     WHERE q.quiz_id = $1
     GROUP BY q.id ORDER BY q.order_index`,
    [id, user.role]
  );

  // For student, check attempt count
  let attemptInfo = null;
  if (user.role === 'student') {
    const { rows: attempts } = await query(
      'SELECT COUNT(*) AS count FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
      [id, user.userId]
    );
    attemptInfo = {
      attemptsUsed: parseInt(attempts[0].count),
      maxAttempts: quiz[0].max_attempts,
      canAttempt: parseInt(attempts[0].count) < quiz[0].max_attempts,
    };
  }

  return success(res, { ...quiz[0], questions, attemptInfo });
}

export async function createOrUpdateQuiz(req: Request, res: Response) {
  const { moduleId, title, description, timeLimitMins, passMarks, maxAttempts, isPublished, questions = [] } = req.body;
  const user = req.user!;
  if (user.role === 'student') return error(res, 'Students cannot manage quizzes', 403);

  if (!moduleId || !title) return error(res, 'moduleId and title required');

  const courseId = await getCourseIdForModule(moduleId);
  if (!courseId) return error(res, 'Module not found', 404);
  if (user.role === 'teacher') {
    const ok = await teacherManagesCourse(user.userId, courseId);
    if (!ok) return error(res, 'Access denied', 403);
  }

  const { rows: existing } = await query('SELECT id FROM quizzes WHERE module_id = $1', [moduleId]);

  let quizId: string;
  if (existing.length) {
    quizId = existing[0].id;
    await query(
      `UPDATE quizzes SET title=$1, description=$2, time_limit_mins=$3, pass_marks=$4,
       max_attempts=$5, is_published=$6 WHERE id=$7`,
      [title, description, timeLimitMins, passMarks, maxAttempts || 3, isPublished ?? false, quizId]
    );
  } else {
    quizId = uuidv4();
    await query(
      `INSERT INTO quizzes (id, module_id, title, description, time_limit_mins, pass_marks, max_attempts, is_published, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [quizId, moduleId, title, description, timeLimitMins, passMarks, maxAttempts || 3, isPublished ?? false, user.userId]
    );
  }

  // Replace all questions
  if (questions.length) {
    await query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const questionId = uuidv4();
      await query(
        `INSERT INTO quiz_questions (id, quiz_id, question_text, explanation, marks, order_index)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [questionId, quizId, q.questionText, q.explanation || null, q.marks || 1, qi]
      );
      for (let oi = 0; oi < (q.options || []).length; oi++) {
        const o = q.options[oi];
        await query(
          `INSERT INTO quiz_options (id, question_id, option_label, option_text, is_correct, order_index)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [uuidv4(), questionId, o.label, o.text, o.isCorrect || false, oi]
        );
      }
    }
  }

  await logAudit(user.userId, 'upsert_quiz', 'quiz', quizId, null, req.body, req);
  return success(res, { id: quizId }, 200, 'Quiz saved');
}

export async function submitQuiz(req: Request, res: Response) {
  const { id } = req.params;
  const { answers, startedAt } = req.body; // answers: [{ questionId, selectedOptionId }]
  const user = req.user!;
  if (user.role !== 'student') return error(res, 'Only students can submit quizzes', 403);

  const { rows: quiz } = await query('SELECT * FROM quizzes WHERE id = $1 AND is_published = true', [id]);
  if (!quiz.length) return error(res, 'Quiz not found', 404);

  // Check attempt limit
  const { rows: prevAttempts } = await query(
    'SELECT COUNT(*) AS count FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
    [id, user.userId]
  );
  if (parseInt(prevAttempts[0].count) >= quiz[0].max_attempts) {
    return error(res, `Maximum ${quiz[0].max_attempts} attempt(s) allowed`, 400);
  }

  // Load questions + correct options
  const { rows: questions } = await query(
    `SELECT q.id, q.marks,
            (SELECT o.id FROM quiz_options o WHERE o.question_id = q.id AND o.is_correct = true LIMIT 1) AS correct_option_id
     FROM quiz_questions q WHERE q.quiz_id = $1`,
    [id]
  );

  let score = 0;
  let maxScore = 0;
  const answerMap: Record<string, string> = {};
  for (const a of (answers || [])) answerMap[a.questionId] = a.selectedOptionId;

  const attemptId = uuidv4();
  const submittedAt = new Date();
  const durationSecs = startedAt ? Math.round((submittedAt.getTime() - new Date(startedAt).getTime()) / 1000) : null;

  await query(
    `INSERT INTO quiz_attempts (id, quiz_id, student_id, started_at, submitted_at, duration_secs, status)
     VALUES ($1,$2,$3,$4,$5,$6,'submitted')`,
    [attemptId, id, user.userId, startedAt || submittedAt, submittedAt, durationSecs]
  );

  const answerResults = [];
  for (const q of questions) {
    maxScore += parseFloat(q.marks);
    const selectedOptionId = answerMap[q.id] || null;
    const isCorrect = selectedOptionId === q.correct_option_id;
    const marksAwarded = isCorrect ? parseFloat(q.marks) : 0;
    score += marksAwarded;

    await query(
      `INSERT INTO quiz_answers (id, attempt_id, question_id, selected_option_id, is_correct, marks_awarded)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), attemptId, q.id, selectedOptionId, isCorrect, marksAwarded]
    );
    answerResults.push({ questionId: q.id, selectedOptionId, isCorrect, marksAwarded, correctOptionId: q.correct_option_id });
  }

  const isPassed = quiz[0].pass_marks ? score >= quiz[0].pass_marks : true;
  await query(
    'UPDATE quiz_attempts SET score=$1, max_score=$2, is_passed=$3 WHERE id=$4',
    [score, maxScore, isPassed, attemptId]
  );

  // Return full result with explanations
  const { rows: fullQuestions } = await query(
    `SELECT q.id, q.question_text, q.explanation, q.marks,
            json_agg(json_build_object('id', o.id, 'label', o.option_label, 'text', o.option_text, 'isCorrect', o.is_correct) ORDER BY o.order_index) AS options
     FROM quiz_questions q LEFT JOIN quiz_options o ON o.question_id = q.id
     WHERE q.quiz_id = $1 GROUP BY q.id ORDER BY q.order_index`,
    [id]
  );

  return success(res, {
    attemptId,
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    isPassed,
    durationSecs,
    questions: fullQuestions,
    answers: answerResults,
  });
}

export async function getAttempts(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  let sql: string;
  let params: any[];

  if (user.role === 'student') {
    sql = `SELECT qa.*, u.first_name, u.last_name FROM quiz_attempts qa
           JOIN users u ON u.id = qa.student_id
           WHERE qa.quiz_id = $1 AND qa.student_id = $2 ORDER BY qa.started_at DESC`;
    params = [id, user.userId];
  } else {
    sql = `SELECT qa.*, u.first_name, u.last_name, u.username FROM quiz_attempts qa
           JOIN users u ON u.id = qa.student_id
           WHERE qa.quiz_id = $1 ORDER BY qa.started_at DESC`;
    params = [id];
  }

  const { rows } = await query(sql, params);
  return success(res, rows);
}

export async function getAttemptDetail(req: Request, res: Response) {
  const { attemptId } = req.params;
  const user = req.user!;

  const { rows: attempt } = await query(
    `SELECT qa.*, u.first_name, u.last_name, q.title AS quiz_title
     FROM quiz_attempts qa JOIN users u ON u.id = qa.student_id JOIN quizzes q ON q.id = qa.quiz_id
     WHERE qa.id = $1`,
    [attemptId]
  );
  if (!attempt.length) return error(res, 'Attempt not found', 404);

  if (user.role === 'student' && attempt[0].student_id !== user.userId) {
    return error(res, 'Access denied', 403);
  }

  const { rows: answers } = await query(
    `SELECT ans.*, q.question_text, q.explanation, q.marks,
            sel.option_text AS selected_text, sel.option_label AS selected_label,
            cor.option_text AS correct_text, cor.option_label AS correct_label
     FROM quiz_answers ans
     JOIN quiz_questions q ON q.id = ans.question_id
     LEFT JOIN quiz_options sel ON sel.id = ans.selected_option_id
     LEFT JOIN quiz_options cor ON cor.question_id = q.id AND cor.is_correct = true
     WHERE ans.attempt_id = $1 ORDER BY q.order_index`,
    [attemptId]
  );

  return success(res, { ...attempt[0], answers });
}
