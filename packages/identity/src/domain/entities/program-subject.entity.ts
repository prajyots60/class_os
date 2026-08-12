import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export interface ProgramSubjectProps {
  id: string;
  instituteId: string;
  programId: string;
  subjectId: string;
  createdAt: Date;
}

export interface CreateProgramSubjectProps {
  id?: string;
  instituteId: string;
  programId: string;
  subjectId: string;
}

export interface ProgramSubjectDTO {
  id: string;
  instituteId: string;
  programId: string;
  subjectId: string;
  createdAt: string;
}

/**
 * ProgramSubject Domain Relationship Aggregate
 *
 * Represents an explicit tenant-scoped mapping linking a Subject to a Program.
 */
export class ProgramSubjectEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _programId: string;
  private readonly _subjectId: string;
  private readonly _createdAt: Date;

  private constructor(props: ProgramSubjectProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('ProgramSubject ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.programId || typeof props.programId !== 'string' || props.programId.trim() === '') {
      throw new ValidationError('Program ID cannot be empty');
    }

    if (!props.subjectId || typeof props.subjectId !== 'string' || props.subjectId.trim() === '') {
      throw new ValidationError('Subject ID cannot be empty');
    }

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._programId = props.programId.trim();
    this._subjectId = props.subjectId.trim();
    this._createdAt = props.createdAt;
  }

  public static create(props: CreateProgramSubjectProps): ProgramSubjectEntity {
    const now = new Date();
    return new ProgramSubjectEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      programId: props.programId,
      subjectId: props.subjectId,
      createdAt: now,
    });
  }

  /**
   * Factory method with explicit cross-tenant validation check.
   */
  public static createVerified(props: {
    id?: string;
    instituteId: string;
    programId: string;
    programInstituteId: string;
    subjectId: string;
    subjectInstituteId: string;
  }): ProgramSubjectEntity {
    if (props.programInstituteId !== props.instituteId) {
      throw new ValidationError(
        `Cross-tenant mapping prohibited: Program tenant "${props.programInstituteId}" does not match target tenant "${props.instituteId}".`,
      );
    }

    if (props.subjectInstituteId !== props.instituteId) {
      throw new ValidationError(
        `Cross-tenant mapping prohibited: Subject tenant "${props.subjectInstituteId}" does not match target tenant "${props.instituteId}".`,
      );
    }

    return ProgramSubjectEntity.create({
      id: props.id,
      instituteId: props.instituteId,
      programId: props.programId,
      subjectId: props.subjectId,
    });
  }

  public static from(props: ProgramSubjectProps): ProgramSubjectEntity {
    return new ProgramSubjectEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get programId(): string {
    return this._programId;
  }

  public get subjectId(): string {
    return this._subjectId;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public toDTO(): ProgramSubjectDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      programId: this._programId,
      subjectId: this._subjectId,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
