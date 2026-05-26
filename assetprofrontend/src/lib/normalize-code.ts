/**
 * Code-field normalization shared by every form whose `code` column is
 * validated server-side against /^[A-Z0-9-_]+$/ (department, position,
 * cadre, grade level, project type, loan type, etc.).
 *
 * Without this, users hit a 400 after submit when they type "HR Admin"
 * or "dept/01". Run free-form input through normalizeCode in the field's
 * onChange so what they see is what the backend will accept.
 */

export const CODE_REGEX = /^[A-Z0-9_-]+$/;

export const CODE_RULE_HINT =
  'Auto-formatted: uppercased; spaces become hyphens; other characters stripped';

/**
 * Uppercases letters, collapses whitespace into a single hyphen, and drops
 * any character not in [A-Z0-9_-].
 *   "HR Department / Admin" → "HR-DEPARTMENT-ADMIN"
 *   "dept.01"               → "DEPT01"
 */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '');
}
