import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { createPaymentIntent, verifyPayment } from '../services/payment.service';
import { success, error } from '../utils/response';
import { enrollStudentInCourse, isStudentEnrolled, hasPaidForCourse } from '../utils/enrollment';
import { getActivePromoDiscount } from '../services/notification.service';

export async function listPayments(req: Request, res: Response) {
  const user = req.user!;
  let sql: string;
  let params: any[];

  if (user.role === 'student') {
    sql = `SELECT p.*, c.name AS course_name FROM payments p JOIN courses c ON c.id = p.course_id
           WHERE p.student_id = $1 ORDER BY p.created_at DESC`;
    params = [user.userId];
  } else {
    sql = `SELECT p.*, c.name AS course_name, u.first_name, u.last_name, u.username
           FROM payments p JOIN courses c ON c.id = p.course_id JOIN users u ON u.id = p.student_id
           ORDER BY p.created_at DESC LIMIT 200`;
    params = [];
  }

  const { rows } = await query(sql, params);
  return success(res, rows);
}

export async function initiatePayment(req: Request, res: Response) {
  const { courseId } = req.body;
  const user = req.user!;

  if (user.role !== 'student') {
    return error(res, 'Only students can purchase courses', 403);
  }
  if (!courseId) return error(res, 'courseId required');

  const studentId = user.userId;

  if (await isStudentEnrolled(studentId, courseId)) {
    return error(res, 'You are already enrolled in this course', 400);
  }

  const { rows: course } = await query(
    'SELECT id, name, price, currency, is_active FROM courses WHERE id = $1',
    [courseId]
  );
  if (!course.length) return error(res, 'Course not found', 404);
  if (!course[0].is_active) return error(res, 'This course is not available', 400);

  let price = Number(course[0].price) || 0;
  let discountPercent = 0;
  const promo = await getActivePromoDiscount(studentId, courseId);
  if (promo && price > 0) {
    discountPercent = promo.discountPercent;
    price = promo.promoPrice;
  }

  // Free courses: enroll immediately without payment record
  if (price <= 0) {
    await enrollStudentInCourse(studentId, courseId, studentId);
    return success(res, {
      paymentId: null,
      enrolled: true,
      freeCourse: true,
      amount: 0,
      currency: course[0].currency,
    }, 200, 'Enrolled successfully (free course)');
  }

  if (await hasPaidForCourse(studentId, courseId)) {
    await enrollStudentInCourse(studentId, courseId, studentId);
    return success(res, { enrolled: true, alreadyPaid: true }, 200, 'Enrolled successfully');
  }

  // Reuse existing pending payment for this course
  const { rows: pending } = await query(
    `SELECT id, gateway_transaction_id, amount, currency, payment_gateway
     FROM payments
     WHERE student_id = $1 AND course_id = $2 AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [studentId, courseId]
  );

  if (pending.length) {
    return success(res, {
      paymentId: pending[0].id,
      gatewayTransactionId: pending[0].gateway_transaction_id,
      gateway: pending[0].payment_gateway,
      amount: pending[0].amount,
      currency: pending[0].currency,
      isMock: pending[0].payment_gateway === 'mock',
      resumable: true,
    });
  }

  const intent = await createPaymentIntent(price, course[0].currency, {
    studentId,
    courseId,
    courseName: course[0].name,
  });

  const paymentId = uuidv4();
  await query(
    `INSERT INTO payments (id, student_id, course_id, amount, currency, status, payment_gateway, gateway_transaction_id)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)`,
    [paymentId, studentId, courseId, price, course[0].currency, intent.gateway, intent.gatewayTransactionId]
  );

  return success(res, {
    paymentId,
    gatewayTransactionId: intent.gatewayTransactionId,
    clientSecret: intent.clientSecret,
    paymentUrl: intent.paymentUrl,
    gateway: intent.gateway,
    amount: price,
    originalPrice: Number(course[0].price) || 0,
    discountPercent,
    currency: course[0].currency,
    isMock: intent.gateway === 'mock',
    courseName: course[0].name,
  }, 201);
}

export async function confirmPayment(req: Request, res: Response) {
  const { paymentId, gatewayTransactionId } = req.body;
  const user = req.user!;

  if (!paymentId) return error(res, 'paymentId required');

  const { rows } = await query(`SELECT * FROM payments WHERE id = $1`, [paymentId]);
  if (!rows.length) return error(res, 'Payment not found', 404);

  const payment = rows[0];

  if (user.role === 'student' && payment.student_id !== user.userId) {
    return error(res, 'Access denied', 403);
  }

  if (payment.status === 'paid') {
    if (!(await isStudentEnrolled(payment.student_id, payment.course_id))) {
      await enrollStudentInCourse(payment.student_id, payment.course_id, payment.student_id);
    }
    return success(res, { status: 'paid', enrolled: true }, 200, 'Already paid — you are enrolled');
  }

  const verification = await verifyPayment(gatewayTransactionId || payment.gateway_transaction_id);

  await query(
    `UPDATE payments SET status=$1, paid_at=$2, gateway_response=$3 WHERE id=$4`,
    [
      verification.status,
      verification.status === 'paid' ? new Date() : null,
      JSON.stringify(verification.gatewayResponse),
      paymentId,
    ]
  );

  let enrolled = false;
  if (verification.status === 'paid') {
    await enrollStudentInCourse(payment.student_id, payment.course_id, payment.student_id);
    enrolled = true;
  }

  return success(res, {
    status: verification.status,
    success: verification.success,
    enrolled,
  }, 200, enrolled ? 'Payment successful — you are now enrolled' : 'Payment failed');
}

export async function adminUpdatePayment(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
  if (!validStatuses.includes(status)) return error(res, 'Invalid status');

  const { rows: before } = await query('SELECT * FROM payments WHERE id = $1', [id]);
  if (!before.length) return error(res, 'Payment not found', 404);

  await query(
    `UPDATE payments SET status=$1, paid_at=CASE WHEN $1='paid' THEN NOW() ELSE paid_at END WHERE id=$2`,
    [status, id]
  );

  if (status === 'paid' && !(await isStudentEnrolled(before[0].student_id, before[0].course_id))) {
    await enrollStudentInCourse(before[0].student_id, before[0].course_id, req.user!.userId);
  }

  return success(res, null, 200, 'Payment status updated');
}

export async function getPaymentSummary(req: Request, res: Response) {
  const { rows } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid') AS total_paid,
      COUNT(*) FILTER (WHERE status = 'pending') AS total_pending,
      COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_revenue,
      COUNT(DISTINCT student_id) FILTER (WHERE status = 'paid') AS paying_students
    FROM payments
  `);
  return success(res, rows[0]);
}
