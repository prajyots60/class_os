import { ValidationError } from '@coaching-os/shared';

export interface StudentLinkProps {
  id: string;
  childProfileId: string;
  studentId: string;
  instituteId: string;
}

export interface StudentLinkDTO {
  id: string;
  childProfileId: string;
  studentId: string;
  instituteId: string;
}

export class StudentLinkEntity {
  private constructor(private readonly props: StudentLinkProps) {
    this.validate();
  }

  private validate(): void {
    if (!this.props.id || typeof this.props.id !== 'string') {
      throw new ValidationError('StudentLink ID is required');
    }
    if (!this.props.childProfileId || typeof this.props.childProfileId !== 'string') {
      throw new ValidationError('ChildProfile ID is required');
    }
    if (!this.props.studentId || typeof this.props.studentId !== 'string') {
      throw new ValidationError('Student ID is required');
    }
    if (!this.props.instituteId || typeof this.props.instituteId !== 'string') {
      throw new ValidationError('Institute ID is required');
    }
  }

  public static create(props: Omit<StudentLinkProps, 'id'> & { id?: string }): StudentLinkEntity {
    const id = props.id ?? crypto.randomUUID();
    return new StudentLinkEntity({
      id,
      childProfileId: props.childProfileId,
      studentId: props.studentId,
      instituteId: props.instituteId,
    });
  }

  public static reconstruct(props: StudentLinkProps): StudentLinkEntity {
    return new StudentLinkEntity(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get childProfileId(): string {
    return this.props.childProfileId;
  }

  public get studentId(): string {
    return this.props.studentId;
  }

  public get instituteId(): string {
    return this.props.instituteId;
  }

  public toDTO(): StudentLinkDTO {
    return {
      id: this.props.id,
      childProfileId: this.props.childProfileId,
      studentId: this.props.studentId,
      instituteId: this.props.instituteId,
    };
  }
}
