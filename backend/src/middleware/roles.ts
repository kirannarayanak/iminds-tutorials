import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { error } from '../utils/response';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return error(res, 'Unauthorized', 401);
    if (!roles.includes(req.user.role)) {
      return error(res, 'Forbidden — insufficient role', 403);
    }
    next();
  };
}

export const isAdmin = requireRole('admin');
export const isTeacher = requireRole('teacher');
export const isAdminOrTeacher = requireRole('admin', 'teacher');
export const isAnyRole = requireRole('admin', 'teacher', 'student');
