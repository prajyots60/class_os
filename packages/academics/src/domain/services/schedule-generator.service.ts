import { ValidationError } from '@coaching-os/shared';
import { BatchSessionEntity } from '../entities/batch-session.entity';
import { ScheduleEntity } from '../entities/schedule.entity';

export interface GenerateCandidateSessionsProps {
  schedules: ScheduleEntity[];
  instituteId: string;
  batchId: string;
  startDate: Date | string;
  endDate: Date | string;
}

export class ScheduleGeneratorService {
  /**
   * Calculates matching calendar dates within [startDate, endDate] for a recurring schedule rule.
   *
   * Calendar dates are normalized to UTC midnight (00:00:00.000Z) representing the operational
   * local calendar day of the institute without timezone boundary shifts.
   */
  public static calculateMatchingDates(
    schedule: ScheduleEntity,
    startDate: Date | string,
    endDate: Date | string,
  ): Date[] {
    const start = ScheduleGeneratorService.normalizeToUtcDate(startDate);
    const end = ScheduleGeneratorService.normalizeToUtcDate(endDate);

    if (end.getTime() < start.getTime()) {
      throw new ValidationError('End date must be on or after start date for session generation.');
    }

    const targetDayIndex = schedule.dayOfWeek.getDayIndex();
    const matchingDates: Date[] = [];

    const current = new Date(start.getTime());
    while (current.getTime() <= end.getTime()) {
      if (current.getUTCDay() === targetDayIndex) {
        matchingDates.push(new Date(current.getTime()));
      }
      // Move to next day (24 hours = 86400000 ms)
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return matchingDates;
  }

  /**
   * Generates candidate BatchSession entities from batch schedules over a date range.
   *
   * Note: Filter out existing sessions separately using repository lookup to ensure idempotency.
   */
  public static generateCandidateSessions(props: GenerateCandidateSessionsProps): BatchSessionEntity[] {
    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.batchId || typeof props.batchId !== 'string' || props.batchId.trim() === '') {
      throw new ValidationError('Batch ID cannot be empty');
    }

    const candidateSessions: BatchSessionEntity[] = [];

    for (const schedule of props.schedules) {
      if (schedule.batchId !== props.batchId) {
        throw new ValidationError(
          `Schedule "${schedule.id}" belongs to batch "${schedule.batchId}", not target batch "${props.batchId}".`,
        );
      }

      const dates = ScheduleGeneratorService.calculateMatchingDates(
        schedule,
        props.startDate,
        props.endDate,
      );

      for (const date of dates) {
        const session = BatchSessionEntity.create({
          instituteId: props.instituteId,
          batchId: props.batchId,
          date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: 'scheduled',
          attendanceTaken: false,
        });

        candidateSessions.push(session);
      }
    }

    return candidateSessions;
  }

  /**
   * Normalizes a Date object or date string to a UTC midnight Date object (00:00:00.000Z).
   *
   * If a "YYYY-MM-DD" formatted string is provided, year/month/day components are extracted
   * directly to avoid server/container timezone boundary skew.
   */
  public static normalizeToUtcDate(dateInput: Date | string): Date {
    if (!dateInput) {
      throw new ValidationError('Date input cannot be empty');
    }

    if (typeof dateInput === 'string') {
      const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        return new Date(Date.UTC(year, month, day));
      }
    }

    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) {
      throw new ValidationError(`Invalid date string: "${dateInput}"`);
    }

    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
}
