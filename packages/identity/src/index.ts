export const IDENTITY_MODULE_NAME = 'identity';

// Authorization Vocabulary & Registry
export * from './authorization';

// Domain Entities & Repositories
export * from './domain/entities/institute.entity';
export * from './domain/entities/institute-membership.entity';
export * from './domain/repositories/institute.repository';
export * from './domain/repositories/institute-membership.repository';

// Application Use Cases
export * from './application/use-cases/institute.use-cases';
export * from './application/use-cases/membership.use-cases';

// Presentation Validators
export * from './presentation/validators/institute.validator';
export * from './presentation/validators/membership.validator';

// Infrastructure Repositories
export * from './infrastructure/repositories/prisma-institute.repository';
export * from './infrastructure/repositories/prisma-institute-membership.repository';
