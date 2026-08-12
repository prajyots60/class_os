import type { ProgramSubjectEntity } from '../entities/program-subject.entity';

/**
 * ProgramSubjectRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Program-Subject join relationship persistence.
 */
export interface ProgramSubjectRepository {
  create(programSubject: ProgramSubjectEntity): Promise<ProgramSubjectEntity>;
  findById(instituteId: string, id: string): Promise<ProgramSubjectEntity | null>;
  findByPair(instituteId: string, programId: string, subjectId: string): Promise<ProgramSubjectEntity | null>;
  listByInstituteId(instituteId: string): Promise<ProgramSubjectEntity[]>;
  listByProgramId(instituteId: string, programId: string): Promise<ProgramSubjectEntity[]>;
  listBySubjectId(instituteId: string, subjectId: string): Promise<ProgramSubjectEntity[]>;
  deleteByPair(instituteId: string, programId: string, subjectId: string): Promise<boolean>;
  existsByPair(instituteId: string, programId: string, subjectId: string): Promise<boolean>;
}
