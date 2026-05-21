import { Response } from 'express';

export function success(res: Response, data: any, statusCode = 200, message?: string) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function error(res: Response, message: string, statusCode = 400, errors?: any) {
  return res.status(statusCode).json({ success: false, message, errors });
}
