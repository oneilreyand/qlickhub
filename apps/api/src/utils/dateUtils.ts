/**
 * Shared date utility helpers for the API layer.
 *
 * Canonical implementations — do not redeclare these in individual service files.
 * Import from here:
 *   import { iso } from '../../utils/dateUtils.js';
 */

/**
 * Converts any date-like value to an ISO 8601 UTC string.
 *
 * - `Date` objects and parseable strings are converted directly.
 * - `null` / `undefined` / unparseable values fall back to the current instant.
 *
 * @param value - A Date object, ISO string, or nullish value.
 * @returns An ISO 8601 string, e.g. `"2026-09-02T14:30:00.000Z"`.
 */
export function iso(value?: Date | string | null): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
