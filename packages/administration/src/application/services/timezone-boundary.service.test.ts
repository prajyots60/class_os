import { describe, it, expect } from 'vitest';
import { getInstituteLocalTodayRange } from './timezone-boundary.service';

describe('timezone-boundary.service', () => {
  it('should correctly derive startOfDay and endOfDay for Asia/Kolkata timezone', () => {
    // Reference date: 2026-08-17 12:00:00 UTC
    const ref = new Date('2026-08-17T12:00:00.000Z');
    const range = getInstituteLocalTodayRange('Asia/Kolkata', ref);

    expect(range.todayIso).toBe('2026-08-17');
    expect(range.timezone).toBe('Asia/Kolkata');
    expect(range.startOfDay.toISOString()).toBe('2026-08-17T00:00:00.000Z');
    expect(range.endOfDay.toISOString()).toBe('2026-08-17T23:59:59.999Z');
  });

  it('should handle date rollover differences between UTC and America/New_York timezone', () => {
    // Reference date: 2026-08-18 02:00:00 UTC -> 2026-08-17 22:00:00 EDT (New York)
    const ref = new Date('2026-08-18T02:00:00.000Z');
    const rangeNy = getInstituteLocalTodayRange('America/New_York', ref);
    const rangeUtc = getInstituteLocalTodayRange('UTC', ref);

    expect(rangeNy.todayIso).toBe('2026-08-17');
    expect(rangeUtc.todayIso).toBe('2026-08-18');
  });

  it('should fallback gracefully to Asia/Kolkata if empty timezone passed', () => {
    const range = getInstituteLocalTodayRange('');
    expect(range.timezone).toBe('Asia/Kolkata');
  });
});
