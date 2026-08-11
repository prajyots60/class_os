export const IDENTITY_MODULE_NAME = 'identity';

// Authorization Vocabulary & Registry
export * from './authorization';

// Domain Entities, Value Objects & Repositories
export * from './domain/entities/institute.entity';
export * from './domain/entities/institute-membership.entity';
export * from './domain/entities/parent-identity.entity';
export * from './domain/value-objects/phone-number.vo';
export * from './domain/repositories/institute.repository';
export * from './domain/repositories/institute-membership.repository';
export * from './domain/repositories/institute-onboarding.repository';
export * from './domain/repositories/parent-identity.repository';

// Application Use Cases
export * from './application/use-cases/institute.use-cases';
export * from './application/use-cases/membership.use-cases';
export * from './application/use-cases/onboarding.use-cases';
export * from './application/use-cases/settings.use-cases';

// Presentation Validators
export * from './presentation/validators/institute.validator';
export * from './presentation/validators/membership.validator';
export * from './presentation/validators/onboarding.validator';

// Infrastructure Repositories
export * from './infrastructure/repositories/prisma-institute.repository';
export * from './infrastructure/repositories/prisma-institute-membership.repository';
export * from './infrastructure/repositories/prisma-onboard-institute.repository';
export * from './infrastructure/repositories/prisma-parent-identity.repository';
