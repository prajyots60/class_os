/**
 * timezone-boundary.service.ts
 *
 * Framework-independent date/time utility service for institute-local calendar boundaries.
 *
 * INVARIANTS:
 * - Computes startOfDay (00:00:00.000) and endOfDay (23:59:59.999) in the institute's configured timezone.
 * - Never uses browser timezone or unanchored UTC date strings.
 */

export interface TodayDateRange {
  todayIso: string; // Format: "YYYY-MM-DD"
  startOfDay: Date; // UTC Date object representing 00:00:00.000 in target timezone
  endOfDay: Date;   // UTC Date object representing 23:59:59.999 in target timezone
  timezone: string;
}

export function getInstituteLocalTodayRange(
  timezoneStr: string = 'Asia/Kolkata',
  referenceDate: Date = new Date(),
): TodayDateRange {
  const tz = timezoneStr?.trim() || 'Asia/Kolkata';

  // Format referenceDate into YYYY-MM-DD in target timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayIso = formatter.format(referenceDate); // "YYYY-MM-DD"

  const [yearStr, monthStr, dayStr] = todayIso.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed month
  const day = parseInt(dayStr, 10);

  // UTC Date objects representing startOfDay and endOfDay for PostgreSQL Date/DateTime comparisons
  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  return {
    todayIso,
    startOfDay,
    endOfDay,
    timezone: tz,
  };
}
