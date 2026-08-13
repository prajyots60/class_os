export const ACADEMICS_MODULE_NAME = 'academics';

// Value Objects & Domain Entities
export * from './domain/value-objects/day-of-week.vo';
export * from './domain/value-objects/time-of-day.vo';
export * from './domain/entities/schedule.entity';
export * from './domain/entities/batch-session.entity';
export * from './domain/entities/attendance.entity';
export * from './domain/entities/homework.entity';

// Domain Services & Repositories
export * from './domain/services/schedule-generator.service';
export * from './domain/repositories/schedule.repository';
export * from './domain/repositories/batch-session.repository';
export * from './domain/repositories/attendance.repository';
export * from './domain/repositories/homework.repository';

// Application Use Cases & DTOs
export * from './application/use-cases/scheduling.use-cases';
export * from './application/use-cases/attendance.use-cases';
export * from './application/use-cases/homework.use-cases';

// Presentation Validators
export * from './presentation/validators/scheduling.validator';
export * from './presentation/validators/attendance.validator';
export * from './presentation/validators/homework.validator';

// Infrastructure Repositories
export * from './infrastructure/repositories/prisma-schedule.repository';
export * from './infrastructure/repositories/prisma-batch-session.repository';
export * from './infrastructure/repositories/prisma-attendance.repository';
export * from './infrastructure/repositories/prisma-homework.repository';
