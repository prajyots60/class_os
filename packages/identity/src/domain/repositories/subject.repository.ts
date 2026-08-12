import type { SubjectEntity, SubjectStatus } from '../entities/subject.entity';

export interface ListSubjectsOptions {
  status?: SubjectStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * SubjectRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Subject persistence.
 */
export interface SubjectRepository {
  create(subject: SubjectEntity): Promise<SubjectEntity>;
  findById(instituteId: string, id: string): Promise<SubjectEntity | null>;
  findByCode(instituteId: string, code: string): Promise<SubjectEntity | null>;
  findByName(instituteId: string, name: string): Promise<SubjectEntity | null>;
  listByInstitute(instituteId: string, options?: ListSubjectsOptions): Promise<SubjectEntity[]>;
  update(subject: SubjectEntity): Promise<SubjectEntity>;
  existsByCode(instituteId: string, code: string): Promise<boolean>;
  existsByName(instituteId: string, name: string): Promise<boolean>;
}
