import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { ScheduleEntity } from '../entities/schedule.entity';
import { ScheduleGeneratorService } from './schedule-generator.service';

describe('ScheduleGeneratorService Domain Service', () => {
  it('should calculate matching Monday dates across a 2-week date range', () => {
    const schedule = ScheduleEntity.create({
      batchId: 'batch-123',
      dayOfWeek: 'monday',
      startTime: '17:00',
      endTime: '18:30',
    });

    // Aug 17, 2026 is a Monday. Aug 31, 2026 is a Monday.
    const startDate = new Date('2026-08-17T00:00:00Z');
    const endDate = new Date('2026-08-31T00:00:00Z');

    const matchingDates = ScheduleGeneratorService.calculateMatchingDates(
      schedule,
      startDate,
      endDate,
    );

    expect(matchingDates.length).toBe(3); // Aug 17, Aug 24, Aug 31
    expect(matchingDates[0].toISOString().slice(0, 10)).toBe('2026-08-17');
    expect(matchingDates[1].toISOString().slice(0, 10)).toBe('2026-08-24');
    expect(matchingDates[2].toISOString().slice(0, 10)).toBe('2026-08-31');
  });

  it('should generate candidate sessions for multiple schedules (e.g. Mon & Wed)', () => {
    const mondaySchedule = ScheduleEntity.create({
      batchId: 'batch-123',
      dayOfWeek: 'monday',
      startTime: '17:00',
      endTime: '18:30',
    });

    const wednesdaySchedule = ScheduleEntity.create({
      batchId: 'batch-123',
      dayOfWeek: 'wednesday',
      startTime: '17:00',
      endTime: '18:30',
    });

    // Aug 17 (Mon) to Aug 23 (Sun)
    const candidateSessions = ScheduleGeneratorService.generateCandidateSessions({
      schedules: [mondaySchedule, wednesdaySchedule],
      instituteId: 'inst-1',
      batchId: 'batch-123',
      startDate: '2026-08-17',
      endDate: '2026-08-23',
    });

    expect(candidateSessions.length).toBe(2); // Monday Aug 17 and Wednesday Aug 19
    expect(candidateSessions[0].date.toISOString().slice(0, 10)).toBe('2026-08-17');
    expect(candidateSessions[1].date.toISOString().slice(0, 10)).toBe('2026-08-19');
  });

  it('should parse YYYY-MM-DD date strings without server timezone offset skew', () => {
    const normalized = ScheduleGeneratorService.normalizeToUtcDate('2026-08-17');
    expect(normalized.getUTCFullYear()).toBe(2026);
    expect(normalized.getUTCMonth()).toBe(7); // August = index 7
    expect(normalized.getUTCDate()).toBe(17);
    expect(normalized.toISOString()).toBe('2026-08-17T00:00:00.000Z');
  });

  it('should throw ValidationError if endDate is before startDate', () => {
    const schedule = ScheduleEntity.create({
      batchId: 'batch-123',
      dayOfWeek: 'monday',
      startTime: '17:00',
      endTime: '18:30',
    });

    expect(() =>
      ScheduleGeneratorService.calculateMatchingDates(
        schedule,
        '2026-08-31',
        '2026-08-17',
      ),
    ).toThrow(ValidationError);
  });
});
