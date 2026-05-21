import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { success, error } from '../utils/response';
import { JwtPayload, Role } from '../types';
import { notifyStaffOfNewStudent } from '../services/notification.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerStudent(req: Request, res: Response) {
  const { email, password, firstName, lastName, grade } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return error(res, 'Email, password, first name, and last name are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return error(res, 'Please enter a valid email address');
  }
  if (String(password).length < 6) {
    return error(res, 'Password must be at least 6 characters');
  }

  const { rows: existing } = await query(
    'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1',
    [normalizedEmail]
  );
  if (existing.length) return error(res, 'An account with this email already exists. Please sign in.', 409);

  const { rows: roleRows } = await query('SELECT id FROM roles WHERE name = $1', ['student']);
  if (!roleRows.length) return error(res, 'Student role not configured', 500);

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  await query(
    `INSERT INTO users (id, role_id, first_name, last_name, username, email, password_hash, must_change_password)
     VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
    [userId, roleRows[0].id, firstName.trim(), lastName.trim(), normalizedEmail, normalizedEmail, passwordHash]
  );

  await query(
    `INSERT INTO student_profiles (id, user_id, grade) VALUES ($1,$2,$3)`,
    [uuidv4(), userId, grade || null]
  );

  try {
    await notifyStaffOfNewStudent({
      id: userId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      grade: grade || null,
    });
  } catch (err) {
    console.error('Failed to send staff notifications:', err);
  }

  const payload: JwtPayload = {
    userId,
    username: normalizedEmail,
    role: 'student',
    mustChangePassword: false,
  };
  const tokens = generateTokens(payload);

  return success(res, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: userId,
      username: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      role: 'student',
      mustChangePassword: false,
    },
  }, 201, 'Account created successfully');
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) return error(res, 'Email/username and password required');

  const loginId = String(username).toLowerCase().trim();

  const { rows } = await query(
    `SELECT u.id, u.username, u.password_hash, u.must_change_password, u.is_active,
            u.first_name, u.last_name, u.email, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.username) = $1 OR LOWER(u.email) = $1`,
    [loginId]
  );

  if (!rows.length) return error(res, 'Invalid username or password', 401);
  const user = rows[0];

  if (!user.is_active) return error(res, 'Account is deactivated. Contact admin.', 403);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return error(res, 'Invalid username or password', 401);

  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role_name as Role,
    mustChangePassword: user.must_change_password,
  };

  const tokens = generateTokens(payload);

  return success(res, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role_name,
      mustChangePassword: user.must_change_password,
    },
  });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  if (!newPassword || newPassword.length < 6) {
    return error(res, 'New password must be at least 6 characters');
  }

  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows.length) return error(res, 'User not found', 404);

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) return error(res, 'Current password is incorrect', 400);

  const hash = await bcrypt.hash(newPassword, 12);
  await query(
    'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
    [hash, userId]
  );

  return success(res, null, 200, 'Password changed successfully');
}

export async function refreshAccessToken(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return error(res, 'Refresh token required', 401);

  try {
    const { userId } = verifyRefreshToken(refreshToken);
    const { rows } = await query(
      `SELECT u.id, u.username, u.must_change_password, u.is_active, r.name AS role_name
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [userId]
    );
    if (!rows.length) return error(res, 'User not found', 401);
    if (!rows[0].is_active) return error(res, 'Account is deactivated', 403);

    const payload: JwtPayload = {
      userId: rows[0].id,
      username: rows[0].username,
      role: rows[0].role_name as Role,
      mustChangePassword: rows[0].must_change_password,
    };
    const tokens = generateTokens(payload);
    return success(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch {
    return error(res, 'Invalid or expired refresh token', 401);
  }
}

export async function me(req: Request, res: Response) {
  const { rows } = await query(
    `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.mobile,
            u.must_change_password, u.is_active, u.avatar_url, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [req.user!.userId]
  );
  if (!rows.length) return error(res, 'User not found', 404);
  return success(res, rows[0]);
}
