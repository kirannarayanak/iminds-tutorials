import { query } from '../config/database';

/** Generate base username: firstName + first letter of lastName, lowercase, alphanumeric only */
export function buildBaseUsername(firstName: string, lastName: string): string {
  const base = `${firstName}${lastName.charAt(0)}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  return base;
}

/** Return a unique username, appending a number suffix if base already exists */
export async function generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
  const base = buildBaseUsername(firstName, lastName);
  const { rows } = await query<{ username: string }>(
    `SELECT username FROM users WHERE username LIKE $1 ORDER BY username`,
    [`${base}%`]
  );
  const existing = rows.map((r) => r.username);
  if (!existing.includes(base)) return base;
  let i = 1;
  while (existing.includes(`${base}${i}`)) i++;
  return `${base}${i}`;
}

/** Default password for a new user */
export function generateDefaultPassword(username: string): string {
  return `${username}@123#`;
}
