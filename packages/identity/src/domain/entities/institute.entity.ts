import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';

export type InstituteStatus = 'active' | 'suspended' | 'archived';

export interface InstituteEntityProps {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  timezone: string;
  status: InstituteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstituteProps {
  id?: string;
  name: string;
  slug?: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  timezone?: string;
}

export interface UpdateInstituteDetailsProps {
  name?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  slug?: string;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InstituteEntity {
  private readonly _id: string;
  private _name: string;
  private _slug: string;
  private _phone: string;
  private _email: string;
  private _logoUrl: string | null;
  private _primaryColor: string | null;
  private _timezone: string;
  private _status: InstituteStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InstituteEntityProps) {
    this.validateProps(props);

    this._id = props.id;
    this._name = props.name.trim();
    this._slug = props.slug.trim();
    this._phone = props.phone.trim();
    this._email = props.email.trim();
    this._logoUrl = props.logoUrl ?? null;
    this._primaryColor = props.primaryColor ?? null;
    this._timezone = props.timezone.trim() || 'Asia/Kolkata';
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public static create(props: CreateInstituteProps): InstituteEntity {
    const trimmedName = props.name ? props.name.trim() : '';
    if (!trimmedName) {
      throw new ValidationError('Institute name cannot be empty');
    }

    const rawSlug = props.slug?.trim() || InstituteEntity.normalizeSlug(trimmedName);
    if (!rawSlug) {
      throw new ValidationError('Institute slug cannot be empty');
    }

    if (!InstituteEntity.validateSlug(rawSlug)) {
      throw new ValidationError(
        'Institute slug must contain only lowercase alphanumeric characters and single hyphens',
      );
    }

    const now = new Date();
    return new InstituteEntity({
      id: props.id || crypto.randomUUID(),
      name: trimmedName,
      slug: rawSlug,
      phone: props.phone ? props.phone.trim() : '',
      email: props.email ? props.email.trim() : '',
      logoUrl: props.logoUrl ?? null,
      primaryColor: props.primaryColor ?? null,
      timezone: props.timezone?.trim() || 'Asia/Kolkata',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  public static from(props: InstituteEntityProps): InstituteEntity {
    return new InstituteEntity(props);
  }

  private validateProps(props: InstituteEntityProps): void {
    if (!props.id || !props.id.trim()) {
      throw new ValidationError('Institute ID cannot be empty');
    }
    if (!props.name || !props.name.trim()) {
      throw new ValidationError('Institute name cannot be empty');
    }
    if (!props.slug || !props.slug.trim()) {
      throw new ValidationError('Institute slug cannot be empty');
    }
    if (!InstituteEntity.validateSlug(props.slug.trim())) {
      throw new ValidationError(
        'Institute slug must contain only lowercase alphanumeric characters and single hyphens',
      );
    }
    if (!['active', 'suspended', 'archived'].includes(props.status)) {
      throw new ValidationError(`Invalid InstituteStatus: ${props.status}`);
    }
  }

  public static normalizeSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public static validateSlug(slug: string): boolean {
    return SLUG_REGEX.test(slug);
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get name(): string {
    return this._name;
  }
  public get slug(): string {
    return this._slug;
  }
  public get phone(): string {
    return this._phone;
  }
  public get email(): string {
    return this._email;
  }
  public get logoUrl(): string | null {
    return this._logoUrl;
  }
  public get primaryColor(): string | null {
    return this._primaryColor;
  }
  public get timezone(): string {
    return this._timezone;
  }
  public get status(): InstituteStatus {
    return this._status;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business Mutations
  public updateDetails(props: UpdateInstituteDetailsProps): void {
    let updated = false;

    if (props.name !== undefined) {
      const trimmedName = props.name.trim();
      if (!trimmedName) {
        throw new ValidationError('Institute name cannot be empty');
      }
      this._name = trimmedName;
      updated = true;
    }

    if (props.slug !== undefined) {
      const trimmedSlug = props.slug.trim();
      if (!trimmedSlug) {
        throw new ValidationError('Institute slug cannot be empty');
      }
      if (!InstituteEntity.validateSlug(trimmedSlug)) {
        throw new ValidationError(
          'Institute slug must contain only lowercase alphanumeric characters and single hyphens',
        );
      }
      this._slug = trimmedSlug;
      updated = true;
    }

    if (props.phone !== undefined) {
      this._phone = props.phone.trim();
      updated = true;
    }

    if (props.email !== undefined) {
      this._email = props.email.trim();
      updated = true;
    }

    if (props.timezone !== undefined) {
      const trimmedTz = props.timezone.trim();
      if (!trimmedTz) {
        throw new ValidationError('Institute timezone cannot be empty');
      }
      this._timezone = trimmedTz;
      updated = true;
    }

    if (props.logoUrl !== undefined) {
      this._logoUrl = props.logoUrl ?? null;
      updated = true;
    }

    if (props.primaryColor !== undefined) {
      this._primaryColor = props.primaryColor ?? null;
      updated = true;
    }

    if (updated) {
      this._updatedAt = new Date();
    }
  }

  public archive(): void {
    if (this._status === 'archived') {
      return;
    }
    this._status = 'archived';
    this._updatedAt = new Date();
  }

  public suspend(): void {
    if (this._status === 'suspended') {
      return;
    }
    if (this._status === 'archived') {
      throw new ValidationError('Cannot suspend an archived institute');
    }
    this._status = 'suspended';
    this._updatedAt = new Date();
  }

  public activate(): void {
    if (this._status === 'active') {
      return;
    }
    this._status = 'active';
    this._updatedAt = new Date();
  }

  public toJSON(): InstituteEntityProps {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      phone: this._phone,
      email: this._email,
      logoUrl: this._logoUrl,
      primaryColor: this._primaryColor,
      timezone: this._timezone,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
