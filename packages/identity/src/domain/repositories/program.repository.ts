import type { ProgramEntity, ProgramStatus } from '../entities/program.entity';

export interface ListProgramsOptions {
  status?: ProgramStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * ProgramRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Program persistence.
 */
export interface ProgramRepository {
  create(program: ProgramEntity): Promise<ProgramEntity>;
  findById(instituteId: string, id: string): Promise<ProgramEntity | null>;
  findByCode(instituteId: string, code: string): Promise<ProgramEntity | null>;
  findByName(instituteId: string, name: string): Promise<ProgramEntity | null>;
  listByInstitute(instituteId: string, options?: ListProgramsOptions): Promise<ProgramEntity[]>;
  update(program: ProgramEntity): Promise<ProgramEntity>;
  existsByCode(instituteId: string, code: string): Promise<boolean>;
  existsByName(instituteId: string, name: string): Promise<boolean>;
}
