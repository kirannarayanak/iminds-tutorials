import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool, { query } from '../config/database';
import { generateUniqueUsername, generateDefaultPassword } from '../utils/username';
import { success, error } from '../utils/response';
import { logAudit } from '../middleware/audit';

export async function listUsers(req: Request, res: Response) {
  const { role, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `
    SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.mobile,
           u.must_change_password, u.is_active, u.created_at, r.name AS role
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (role) { params.push(role); sql += ` AND r.name = $${params.length}`; }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }

  sql += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const { rows } = await query(sql, params);
  return success(res, rows);
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const { rows } = await query(
    `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.mobile,
            u.must_change_password, u.is_active, u.avatar_url, u.created_at, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [id]
  );
  if (!rows.length) return error(res, 'User not found', 404);

  const user = rows[0];
  // Fetch profile details
  if (user.role === 'teacher') {
    const { rows: prof } = await query('SELECT * FROM teacher_profiles WHERE user_id = $1', [id]);
    user.profile = prof[0] || null;
  } else if (user.role === 'student') {
    const { rows: prof } = await query('SELECT * FROM student_profiles WHERE user_id = $1', [id]);
    user.profile = prof[0] || null;
  }
  return success(res, user);
}

export async function createUser(req: Request, res: Response) {
  const { firstName, lastName, email, mobile, role, profile = {} } = req.body;

  if (!firstName || !lastName || !role) {
    return error(res, 'firstName, lastName, and role are required');
  }
  if (role !== 'teacher') {
    return error(res, 'Admin can only create teacher accounts. Students sign up on the registration page.');
  }

  const { rows: roleRows } = await query('SELECT id FROM roles WHERE name = $1', [role]);
  if (!roleRows.length) return error(res, 'Invalid role', 400);
  const roleId = roleRows[0].id;

  const username = await generateUniqueUsername(firstName, lastName);
  const defaultPassword = generateDefaultPassword(username);
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  const userId = uuidv4();

  // Check email uniqueness
  if (email) {
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length) return error(res, 'Email already in use');
  }

  await query(
    `INSERT INTO users (id, role_id, first_name, last_name, username, email, mobile, password_hash, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [userId, roleId, firstName, lastName, username, email || null, mobile || null, passwordHash, req.user!.userId]
  );

  // Create role-specific profile
  if (role === 'teacher') {
    await query(
      `INSERT INTO teacher_profiles (id, user_id, qualification, bio, experience_years)
       VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), userId, profile.qualification || null, profile.bio || null, profile.experienceYears || 0]
    );
  }

  await logAudit(req.user!.userId, 'create_user', 'user', userId, null, { firstName, lastName, role }, req);

  return success(res, {
    id: userId,
    username,
    defaultPassword,
    role,
    message: `User created. Share credentials: username="${username}", password="${defaultPassword}"`,
  }, 201);
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { firstName, lastName, email, mobile, isActive, profile = {} } = req.body;

  const { rows } = await query(
    `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [id]
  );
  if (!rows.length) return error(res, 'User not found', 404);
  const old = rows[0];

  await query(
    `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
     email = COALESCE($3, email), mobile = COALESCE($4, mobile),
     is_active = COALESCE($5, is_active) WHERE id = $6`,
    [firstName, lastName, email, mobile, isActive, id]
  );

  // Update profile
  if (old.role === 'teacher' && Object.keys(profile).length) {
    await query(
      `UPDATE teacher_profiles SET qualification = COALESCE($1, qualification),
       bio = COALESCE($2, bio), experience_years = COALESCE($3, experience_years) WHERE user_id = $4`,
      [profile.qualification, profile.bio, profile.experienceYears, id]
    );
  } else if (old.role === 'student' && Object.keys(profile).length) {
    await query(
      `UPDATE student_profiles SET grade = COALESCE($1, grade), parent_name = COALESCE($2, parent_name),
       parent_email = COALESCE($3, parent_email), parent_mobile = COALESCE($4, parent_mobile) WHERE user_id = $5`,
      [profile.grade, profile.parentName, profile.parentEmail, profile.parentMobile, id]
    );
  }

  await logAudit(req.user!.userId, 'update_user', 'user', id, old, req.body, req);
  return success(res, null, 200, 'User updated');
}

export async function resetUserPassword(req: Request, res: Response) {
  const { id } = req.params;
  const { rows } = await query('SELECT username FROM users WHERE id = $1', [id]);
  if (!rows.length) return error(res, 'User not found', 404);

  const { username } = rows[0];
  const newPassword = generateDefaultPassword(username);
  const hash = await bcrypt.hash(newPassword, 12);

  await query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [hash, id]);
  await logAudit(req.user!.userId, 'reset_password', 'user', id, null, null, req);

  return success(res, { newPassword, message: 'Password reset. User must change on next login.' });
}

export async function toggleUserStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { rows } = await query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active', [id]);
  if (!rows.length) return error(res, 'User not found', 404);
  return success(res, { isActive: rows[0].is_active });
}

// Hard-deletes a user. Cascading FKs handle profiles, assignments, enrollments and refresh tokens.
// Nullable "created_by" / "uploaded_by" / "updated_by" columns are NULL'd so we don't break audit trails.
// If the user is a student with payments or quiz attempts, deletion is refused — admin should deactivate instead.
export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  const requesterId = req.user!.userId;

  if (id === requesterId) return error(res, 'You cannot delete your own account', 400);

  const { rows } = await query(
    `SELECT u.id, u.username, u.first_name, u.last_name, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [id]
  );
  if (!rows.length) return error(res, 'User not found', 404);
  const user = rows[0];

  if (user.role === 'admin') {
    const { rows: adminCount } = await query(
      `SELECT COUNT(*)::int AS n FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin'`
    );
    if (adminCount[0].n <= 1) return error(res, 'Cannot delete the last admin account', 400);
  }

  if (user.role === 'student') {
    const { rows: refs } = await query(
      `SELECT
         (SELECT COUNT(*) FROM payments WHERE student_id = $1)::int AS payments,
         (SELECT COUNT(*) FROM quiz_attempts WHERE student_id = $1)::int AS attempts`,
      [id]
    );
    if (refs[0].payments > 0 || refs[0].attempts > 0) {
      return error(
        res,
        'Cannot delete a student with existing payments or quiz attempts. Deactivate the account instead.',
        409
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE courses SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('UPDATE modules SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('UPDATE module_text_content SET updated_by = NULL WHERE updated_by = $1', [id]);
    await client.query('UPDATE module_materials SET uploaded_by = NULL WHERE uploaded_by = $1', [id]);
    await client.query('UPDATE module_videos SET uploaded_by = NULL WHERE uploaded_by = $1', [id]);
    await client.query('UPDATE quizzes SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('UPDATE audit_logs SET actor_id = NULL WHERE actor_id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    return error(res, `Failed to delete user: ${err.message}`, 500);
  } finally {
    client.release();
  }

  await logAudit(requesterId, 'delete_user', 'user', id, user, null, req);
  return success(res, null, 200, `${user.role} ${user.first_name} ${user.last_name} deleted`);
}
