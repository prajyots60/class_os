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
export * from './domain/entities/program.entity';
export * from './domain/entities/subject.entity';
export * from './domain/entities/program-subject.entity';
export * from './domain/entities/batch.entity';
export * from './domain/entities/enrollment.entity';

export * from './domain/value-objects/phone-number.vo';
export * from './domain/value-objects/date-of-birth.vo';
export * from './domain/value-objects/guardian-relationship-type.vo';
export * from './domain/value-objects/program-code.vo';
export * from './domain/value-objects/subject-code.vo';
export * from './domain/value-objects/batch-code.vo';
export * from './domain/value-objects/enrollment-status.vo';

export * from './domain/repositories/institute.repository';
export * from './domain/repositories/institute-membership.repository';
export * from './domain/repositories/institute-onboarding.repository';
export * from './domain/repositories/parent-identity.repository';
export * from './domain/repositories/otp-verification.repository';
export * from './domain/repositories/institute-parent.repository';
export * from './domain/repositories/student.repository';
export * from './domain/repositories/institute-parent-student.repository';
export * from './domain/repositories/program.repository';
export * from './domain/repositories/subject.repository';
export * from './domain/repositories/program-subject.repository';
export * from './domain/repositories/batch.repository';
export * from './domain/repositories/enrollment.repository';
export * from './domain/repositories/parent-authorization.repository';

// Domain Services
export * from './domain/services/otp-provider.service';

// Application Use Cases
export * from './application/dto/parent-identity.dto';
export * from './application/dto/institute-parent.dto';
export * from './application/dto/student.dto';
export * from './application/dto/program.dto';
export * from './application/dto/subject.dto';
export * from './application/dto/program-subject.dto';
export * from './application/dto/batch.dto';
export * from './application/dto/enrollment.dto';
export * from './application/dto/membership.dto';
export * from './application/dto/pagination.dto';
export type {
  StudentGuardianSummaryDTO,
  ParentStudentSummaryDTO,
} from './application/dto/institute-parent-student.dto';
export { toInstituteParentStudentDTO } from './application/dto/institute-parent-student.dto';
export * from './application/use-cases/institute.use-cases';
export * from './application/use-cases/membership.use-cases';
export * from './application/use-cases/onboarding.use-cases';
export * from './application/use-cases/settings.use-cases';
export * from './application/use-cases/parent-identity.use-cases';
export * from './application/use-cases/request-parent-otp.use-case';
export * from './application/use-cases/verify-parent-otp.use-case';
export * from './application/use-cases/institute-parent.use-cases';
export * from './application/use-cases/student.use-cases';
export * from './application/use-cases/institute-parent-student.use-cases';
export * from './application/use-cases/program.use-cases';
export * from './application/use-cases/subject.use-cases';
export * from './application/use-cases/program-subject.use-cases';
export * from './application/use-cases/batch.use-cases';
export * from './application/use-cases/enrollment.use-cases';
export * from './application/use-cases/staff.use-cases';

// Presentation Validators
export * from './presentation/validators/institute.validator';
export * from './presentation/validators/membership.validator';
export * from './presentation/validators/onboarding.validator';
export * from './presentation/validators/institute-parent.validator';
export * from './presentation/validators/student.validator';
export * from './presentation/validators/institute-parent-student.validator';
export * from './presentation/validators/program.validator';
export * from './presentation/validators/subject.validator';
export * from './presentation/validators/program-subject.validator';
export * from './presentation/validators/batch.validator';
export * from './presentation/validators/enrollment.validator';

// Infrastructure Repositories
export * from './infrastructure/repositories/prisma-institute.repository';
export * from './infrastructure/repositories/prisma-institute-membership.repository';
export * from './infrastructure/repositories/prisma-onboard-institute.repository';
export * from './infrastructure/repositories/prisma-parent-identity.repository';
export * from './infrastructure/repositories/prisma-otp-verification.repository';
export * from './infrastructure/repositories/prisma-institute-parent.repository';
export * from './infrastructure/repositories/prisma-student.repository';
export * from './infrastructure/repositories/prisma-institute-parent-student.repository';
export * from './infrastructure/repositories/prisma-program.repository';
export * from './domain/entities/child-profile.entity';
export * from './domain/entities/student-link.entity';

export * from './domain/repositories/child-profile.repository';
export * from './domain/repositories/student-link.repository';
export * from './domain/repositories/parent-hub.repository';

export * from './application/dto/child-profile.dto';
export * from './application/dto/student-link.dto';
export * from './application/dto/parent-hub.dto';

export * from './application/use-cases/child-profile.use-cases';
export * from './application/use-cases/student-link.use-cases';
export * from './application/use-cases/get-parent-hub.use-case';

export * from './infrastructure/repositories/prisma-child-profile.repository';
export * from './infrastructure/repositories/prisma-student-link.repository';
export * from './infrastructure/repositories/prisma-parent-hub.repository';

export * from './infrastructure/repositories/prisma-subject.repository';
export * from './infrastructure/repositories/prisma-program-subject.repository';
export * from './infrastructure/repositories/prisma-batch.repository';
export * from './infrastructure/repositories/prisma-enrollment.repository';
export * from './infrastructure/repositories/prisma-parent-authorization.repository';
export * from './authorization/parent-auth-context';
export * from './authorization/parent-authorization-engine';

