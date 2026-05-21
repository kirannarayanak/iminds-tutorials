import { Request, Response } from 'express';
import { query } from '../config/database';
import { success, error } from '../utils/response';
import {
  buildCourseSuggestions,
  createNotification,
} from '../services/notification.service';

export async function listNotifications(req: Request, res: Response) {
  const userId = req.user!.userId;
  const { unreadOnly } = req.query;

  let sql = `SELECT * FROM notifications WHERE user_id = $1`;
  if (unreadOnly === 'true') sql += ` AND is_read = false`;
  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const { rows } = await query(sql, [userId]);

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  return success(res, { items: rows, unreadCount: countRows[0]?.count ?? 0 });
}

export async function markRead(req: Request, res: Response) {
  const { id } = req.params;
  await query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [id, req.user!.userId]
  );
  return success(res, null, 200, 'Marked as read');
}

export async function markAllRead(req: Request, res: Response) {
  await query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [req.user!.userId]
  );
  return success(res, null, 200, 'All marked as read');
}

export async function getRecommendations(req: Request, res: Response) {
  if (req.user!.role !== 'student') {
    return error(res, 'Only students receive course recommendations', 403);
  }

  const suggestions = await buildCourseSuggestions(req.user!.userId);

  // Persist top suggestions as notifications (avoid duplicates in last 7 days)
  for (const s of suggestions.slice(0, 3)) {
    const { rows: existing } = await query(
      `SELECT id FROM notifications
       WHERE user_id = $1 AND type = 'course_suggestion' AND entity_id = $2
         AND created_at > NOW() - INTERVAL '7 days'`,
      [req.user!.userId, s.id]
    );
    if (!existing.length) {
      const reason = s.suggestionReasons?.[0] || 'Recommended for you';
      await createNotification({
        userId: req.user!.userId,
        type: 'course_suggestion',
        title: `Suggested: ${s.name}`,
        message: `${reason}. ${s.discountPercent ? `Get ${s.discountPercent}% off if you enroll this week!` : 'Explore this course.'}`,
        entityType: 'course',
        entityId: s.id,
        metadata: {
          courseId: s.id,
          courseName: s.name,
          suggestionReasons: s.suggestionReasons,
          discountPercent: s.discountPercent,
          promoPrice: s.promoPrice,
          originalPrice: s.originalPrice,
          currency: s.currency,
        },
      });
    }
  }

  return success(res, suggestions);
}
