import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

export async function logAudit(
  actorId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  oldData?: any,
  newData?: any,
  req?: Request
) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        actorId || null,
        action,
        entityType,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        req?.ip || null,
        req?.headers['user-agent'] || null,
      ]
    );
  } catch (err) {
    // Audit failure should not break the main flow
    console.error('Audit log error:', err);
  }
}
