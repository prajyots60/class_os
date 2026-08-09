export const IDENTITY_MODULE_NAME = 'identity';

// Domain Entities & Repositories
export * from './domain/entities/institute.entity';
export * from './domain/repositories/institute.repository';

// Application Use Cases
export * from './application/use-cases/institute.use-cases';

// Presentation Validators
export * from './presentation/validators/institute.validator';

// Infrastructure Repositories
export * from './infrastructure/repositories/prisma-institute.repository';
