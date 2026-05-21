import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export type NotificationType =
  | 'student_registered'
  | 'new_course'
  | 'promotion'
  | 'course_suggestion';

/** Random launch discount 10–20% for new course promotions */
export function launchDiscountPercent(): number {
  return 10 + Math.floor(Math.random() * 11);
}

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      params.userId,
      params.type,
      params.title,
      params.message,
      params.entityType || null,
      params.entityId || null,
      JSON.stringify(params.metadata || {}),
    ]
  );
  return id;
}

export async function notifyUsersByRole(
  role: 'admin' | 'teacher',
  params: Omit<Parameters<typeof createNotification>[0], 'userId'>
): Promise<void> {
  const { rows } = await query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = $1 AND u.is_active = true`,
    [role]
  );
  for (const u of rows) {
    await createNotification({ ...params, userId: u.id });
  }
}

/** Notify all admins and teachers when a student signs up */
export async function notifyStaffOfNewStudent(student: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grade?: string | null;
}): Promise<void> {
  const gradeText = student.grade ? ` (Grade ${student.grade})` : '';
  const payload = {
    type: 'student_registered' as const,
    title: 'New student registered',
    message: `${student.firstName} ${student.lastName} joined with ${student.email}${gradeText}.`,
    entityType: 'user',
    entityId: student.id,
    metadata: {
      studentId: student.id,
      email: student.email,
      grade: student.grade,
    },
  };
  await notifyUsersByRole('admin', payload);
  await notifyUsersByRole('teacher', payload);
}

/** Notify all students about a new course with promotional discount */
export async function notifyStudentsOfNewCourse(course: {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  creatorName: string;
}): Promise<void> {
  const discountPercent = launchDiscountPercent();
  const promoPrice = Math.round(Number(course.price) * (1 - discountPercent / 100) * 100) / 100;

  const { rows: students } = await query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'student' AND u.is_active = true`
  );

  for (const s of students) {
    await createNotification({
      userId: s.id,
      type: 'new_course',
      title: `New course: ${course.name}`,
      message: `${course.creatorName} published "${course.name}". Limited-time ${discountPercent}% off — enroll now!`,
      entityType: 'course',
      entityId: course.id,
      metadata: {
        courseId: course.id,
        courseName: course.name,
        discountPercent,
        originalPrice: Number(course.price),
        promoPrice,
        currency: course.currency,
        promotionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }
}

/** Course suggestions for a student based on enrolled courses */
export async function buildCourseSuggestions(studentId: string): Promise<any[]> {
  const { rows: enrolled } = await query(
    `SELECT c.id, c.name, c.grade, c.price, c.currency
     FROM courses c
     JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1 AND ce.is_active = true`,
    [studentId]
  );

  const enrolledIds = enrolled.map((c: any) => c.id);
  const enrolledGrades = [...new Set(enrolled.map((c: any) => c.grade).filter(Boolean))];
  const enrolledNames = enrolled.map((c: any) => c.name?.toLowerCase() || '');

  let sql = `
    SELECT c.*,
           EXISTS (SELECT 1 FROM payments p WHERE p.student_id = $1 AND p.course_id = c.id AND p.status = 'pending') AS has_pending_payment,
           COALESCE(
             (SELECT json_agg(json_build_object('id', tu.id, 'first_name', tu.first_name, 'last_name', tu.last_name))
              FROM teacher_course_assignments tca
              JOIN users tu ON tu.id = tca.teacher_id WHERE tca.course_id = c.id),
             '[]'::json
           ) AS teachers
    FROM courses c
    WHERE c.is_active = true
  `;
  const params: any[] = [studentId];

  if (enrolledIds.length) {
    params.push(enrolledIds);
    sql += ` AND c.id != ALL($${params.length}::uuid[])`;
  }

  sql += ` ORDER BY c.name`;

  const { rows: candidates } = await query(sql, params);

  const scored = candidates.map((c: any) => {
    let score = 0;
    const reasons: string[] = [];

    if (enrolledGrades.length && c.grade && enrolledGrades.includes(c.grade)) {
      score += 3;
      reasons.push('Matches your grade level');
    }
    if (c.grade === 'both') {
      score += 2;
      reasons.push('Covers Grade 9 & 10');
    }

    const cName = (c.name || '').toLowerCase();
    if (enrolledNames.includes('science') && cName.includes('math')) {
      score += 4;
      reasons.push('Pairs well with Science');
    }
    if (enrolledNames.includes('math') && cName.includes('science')) {
      score += 4;
      reasons.push('Pairs well with Maths');
    }
    if (!enrolled.length) {
      score += 1;
      reasons.push('Popular starter course');
    }

    const discountPercent = launchDiscountPercent();
    const price = Number(c.price) || 0;
    const promoPrice = price > 0 ? Math.round(price * (1 - discountPercent / 100) * 100) / 100 : 0;

    return {
      ...c,
      suggestionScore: score,
      suggestionReasons: reasons.length ? reasons : ['Recommended for you'],
      discountPercent: price > 0 ? discountPercent : 0,
      promoPrice: price > 0 ? promoPrice : 0,
      originalPrice: price,
    };
  });

  return scored
    .filter((c) => c.suggestionScore > 0 || !enrolled.length)
    .sort((a, b) => b.suggestionScore - a.suggestionScore)
    .slice(0, 6);
}

/** Active promo discount for payment (within 30 days, new_course notification) */
export async function getActivePromoDiscount(
  studentId: string,
  courseId: string
): Promise<{ discountPercent: number; promoPrice: number } | null> {
  const { rows } = await query(
    `SELECT metadata, created_at FROM notifications
     WHERE user_id = $1 AND type IN ('new_course', 'course_suggestion', 'promotion') AND entity_id = $2
       AND created_at > NOW() - INTERVAL '30 days'
     ORDER BY created_at DESC LIMIT 1`,
    [studentId, courseId]
  );
  if (!rows.length) return null;
  const meta = typeof rows[0].metadata === 'string'
    ? JSON.parse(rows[0].metadata)
    : rows[0].metadata;
  if (!meta?.discountPercent) return null;
  return {
    discountPercent: Number(meta.discountPercent),
    promoPrice: Number(meta.promoPrice),
  };
}
