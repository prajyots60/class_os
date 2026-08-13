export const ACADEMICS_MODULE_NAME = 'academics';

// Value Objects & Domain Entities
export * from './domain/value-objects/day-of-week.vo';
export * from './domain/value-objects/time-of-day.vo';
export * from './domain/entities/schedule.entity';
export * from './domain/entities/batch-session.entity';

// Domain Services & Repositories
export * from './domain/services/schedule-generator.service';
export * from './domain/repositories/schedule.repository';
export * from './domain/repositories/batch-session.repository';

// Application Use Cases & DTOs
export * from './application/use-cases/scheduling.use-cases';

// Presentation Validators
export * from './presentation/validators/scheduling.validator';

// Infrastructure Repositories
export * from './infrastructure/repositories/prisma-schedule.repository';
export * from './infrastructure/repositories/prisma-batch-session.repository';
