export const IDENTITY_MODULE_NAME = 'identity';

// Authorization Vocabulary & Registry
export * from './authorization';

// Domain Entities, Value Objects & Repositories
export * from './domain/entities/institute.entity';
export * from './domain/entities/institute-membership.entity';
export * from './domain/entities/parent-identity.entity';
export * from './domain/entities/institute-parent.entity';
export * from './domain/entities/student.entity';
export * from './domain/entities/institute-parent-student.entity';
export * from './domain/value-objects/phone-number.vo';
export * from './domain/value-objects/date-of-birth.vo';
export * from './domain/value-objects/guardian-relationship-type.vo';
export * from './domain/repositories/institute.repository';
export * from './domain/repositories/institute-membership.repository';
export * from './domain/repositories/institute-onboarding.repository';
export * from './domain/repositories/parent-identity.repository';
export * from './domain/repositories/institute-parent.repository';
export * from './domain/repositories/student.repository';
export * from './domain/repositories/institute-parent-student.repository';

// Application Use Cases
export * from './application/dto/parent-identity.dto';
export * from './application/dto/institute-parent.dto';
export * from './application/dto/student.dto';
export * from './application/use-cases/institute.use-cases';
export * from './application/use-cases/membership.use-cases';
export * from './application/use-cases/onboarding.use-cases';
export * from './application/use-cases/settings.use-cases';
export * from './application/use-cases/parent-identity.use-cases';
export * from './application/use-cases/institute-parent.use-cases';
export * from './application/use-cases/student.use-cases';

// Presentation Validators
export * from './presentation/validators/institute.validator';
export * from './presentation/validators/membership.validator';
export * from './presentation/validators/onboarding.validator';
export * from './presentation/validators/institute-parent.validator';
export * from './presentation/validators/student.validator';

// Infrastructure Repositories
export * from './infrastructure/repositories/prisma-institute.repository';
export * from './infrastructure/repositories/prisma-institute-membership.repository';
export * from './infrastructure/repositories/prisma-onboard-institute.repository';
export * from './infrastructure/repositories/prisma-parent-identity.repository';
export * from './infrastructure/repositories/prisma-institute-parent.repository';
export * from './infrastructure/repositories/prisma-student.repository';
export * from './infrastructure/repositories/prisma-institute-parent-student.repository';
