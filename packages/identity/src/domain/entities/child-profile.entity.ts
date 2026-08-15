import { ValidationError } from '@coaching-os/shared';

export interface ChildProfileProps {
  id: string;
  parentIdentityId: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChildProfileDTO {
  id: string;
  parentIdentityId: string;
  name: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ChildProfileEntity {
  private constructor(private readonly props: ChildProfileProps) {
    this.validate();
  }

  private validate(): void {
    if (!this.props.id || typeof this.props.id !== 'string') {
      throw new ValidationError('ChildProfile ID is required');
    }
    if (!this.props.parentIdentityId || typeof this.props.parentIdentityId !== 'string') {
      throw new ValidationError('ParentIdentity ID is required');
    }
    if (!this.props.name || typeof this.props.name !== 'string' || this.props.name.trim().length === 0) {
      throw new ValidationError('ChildProfile name is required');
    }
    if (this.props.name.trim().length > 100) {
      throw new ValidationError('ChildProfile name cannot exceed 100 characters');
    }
    if (this.props.avatar !== null && this.props.avatar !== undefined) {
      if (typeof this.props.avatar !== 'string' || this.props.avatar.length > 255) {
        throw new ValidationError('ChildProfile avatar cannot exceed 255 characters');
      }
    }
  }

  public static create(
    props: Omit<ChildProfileProps, 'id' | 'createdAt' | 'updatedAt' | 'avatar'> & {
      id?: string;
      avatar?: string | null;
    },
  ): ChildProfileEntity {
    const id = props.id ?? crypto.randomUUID();
    const now = new Date();
    return new ChildProfileEntity({
      id,
      parentIdentityId: props.parentIdentityId,
      name: props.name.trim(),
      avatar: props.avatar ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstruct(props: ChildProfileProps): ChildProfileEntity {
    return new ChildProfileEntity(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get parentIdentityId(): string {
    return this.props.parentIdentityId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get avatar(): string | null {
    return this.props.avatar;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateDetails(name?: string, avatar?: string | null): void {
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length === 0) {
        throw new ValidationError('ChildProfile name cannot be empty');
      }
      if (trimmedName.length > 100) {
        throw new ValidationError('ChildProfile name cannot exceed 100 characters');
      }
      this.props.name = trimmedName;
    }

    if (avatar !== undefined) {
      if (avatar !== null && avatar.length > 255) {
        throw new ValidationError('ChildProfile avatar cannot exceed 255 characters');
      }
      this.props.avatar = avatar;
    }

    this.props.updatedAt = new Date();
  }

  public toDTO(): ChildProfileDTO {
    return {
      id: this.props.id,
      parentIdentityId: this.props.parentIdentityId,
      name: this.props.name,
      avatar: this.props.avatar,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
