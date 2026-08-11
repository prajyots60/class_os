import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { DateOfBirth } from '../value-objects/date-of-birth.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';

export type StudentAdmissionStatus = 'pending' | 'admitted' | 'rejected' | 'cancelled';
export type StudentStatus = 'active' | 'inactive' | 'archived';
export type StudentGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface StudentProps {
  id: string;
  instituteId: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth?: DateOfBirth | Date | string | null;
  gender?: StudentGender | null;
  phone?: PhoneNumber | string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  admissionDate?: Date | string | null;
  admissionStatus: StudentAdmissionStatus;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateStudentProps {
  id?: string;
  instituteId: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth?: DateOfBirth | Date | string | null;
  gender?: StudentGender | null;
  phone?: PhoneNumber | string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  admissionDate?: Date | string | null;
  admissionStatus?: StudentAdmissionStatus;
  status?: StudentStatus;
}

export interface StudentDTO {
  id: string;
  instituteId: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  dateOfBirth: string | null;
  gender: StudentGender | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  admissionDate: string | null;
  admissionStatus: StudentAdmissionStatus;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Student Domain Entity
 *
 * Represents an admitted learner profile strictly owned by a specific coaching institute (`instituteId`).
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero database or HTTP framework dependencies.
 * - Owned strictly by an Institute (`instituteId`). Immutable tenant ownership.
 * - `admissionNumber` is an institute-scoped human identifier (e.g. ADM-2026-001).
 * - Distinct from global ParentIdentity (Phase 1.6), tenant InstituteParent CRM (Phase 1.7),
 *   Guardian links (Phase 1.9), and Academic Enrollment (Phase 1.11).
 * - Enforces state machine separation: AdmissionStatus (`pending` | `admitted` | `rejected` | `cancelled`)
 *   vs StudentStatus (`active` | `inactive` | `archived`).
 * - Enforces invariant: `status === 'active'` is allowed ONLY IF `admissionStatus === 'admitted'`.
 */
export class StudentEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _admissionNumber: string;
  private _firstName: string;
  private _middleName: string | null;
  private _lastName: string;
  private _dateOfBirth: DateOfBirth | null;
  private _gender: StudentGender | null;
  private _phone: PhoneNumber | null;
  private _email: string | null;
  private _address: string | null;
  private _city: string | null;
  private _state: string | null;
  private _postalCode: string | null;
  private _admissionDate: Date | null;
  private _admissionStatus: StudentAdmissionStatus;
  private _status: StudentStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: StudentProps) {
    if (!props.id || typeof props.id !== 'string' || props.id.trim() === '') {
      throw new ValidationError('Student ID cannot be empty');
    }

    if (!props.instituteId || typeof props.instituteId !== 'string' || props.instituteId.trim() === '') {
      throw new ValidationError('Institute ID cannot be empty');
    }

    if (!props.admissionNumber || typeof props.admissionNumber !== 'string' || props.admissionNumber.trim() === '') {
      throw new ValidationError('Admission number cannot be empty');
    }

    const normalizedFirstName = StudentEntity.validateName(props.firstName, 'First name');
    const normalizedLastName = StudentEntity.validateName(props.lastName, 'Last name');
    const normalizedMiddleName = props.middleName
      ? StudentEntity.validateName(props.middleName, 'Middle name', true)
      : null;

    const validatedGender = props.gender ? StudentEntity.validateGender(props.gender) : null;
    const validatedDob = props.dateOfBirth ? DateOfBirth.create(props.dateOfBirth) : null;
    const validatedPhone = props.phone ? PhoneNumber.create(props.phone) : null;
    const validatedEmail = props.email ? StudentEntity.validateEmail(props.email) : null;

    const validatedAdmissionStatus = StudentEntity.validateAdmissionStatus(props.admissionStatus);
    const validatedStatus = StudentEntity.validateStudentStatus(props.status);

    // Cross-state invariant check: active status requires admitted admissionStatus
    if (validatedStatus === 'active' && validatedAdmissionStatus !== 'admitted') {
      throw new ValidationError(
        `Cannot set student status to "active" when admission status is "${validatedAdmissionStatus}". Student must be admitted first.`,
      );
    }

    let parsedAdmissionDate: Date | null = null;
    if (props.admissionDate) {
      const d = props.admissionDate instanceof Date ? props.admissionDate : new Date(props.admissionDate);
      if (Number.isNaN(d.getTime())) {
        throw new ValidationError('Invalid admission date');
      }
      parsedAdmissionDate = d;
    }

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._admissionNumber = props.admissionNumber.trim();
    this._firstName = normalizedFirstName;
    this._middleName = normalizedMiddleName;
    this._lastName = normalizedLastName;
    this._dateOfBirth = validatedDob;
    this._gender = validatedGender;
    this._phone = validatedPhone;
    this._email = validatedEmail;
    this._address = props.address ? props.address.trim() || null : null;
    this._city = props.city ? props.city.trim() || null : null;
    this._state = props.state ? props.state.trim() || null : null;
    this._postalCode = props.postalCode ? props.postalCode.trim() || null : null;
    this._admissionDate = parsedAdmissionDate;
    this._admissionStatus = validatedAdmissionStatus;
    this._status = validatedStatus;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt || null;
  }

  /**
   * Factory method to create a new Student entity.
   */
  public static create(props: CreateStudentProps): StudentEntity {
    const now = new Date();
    const admissionStatus = props.admissionStatus || 'admitted';
    const defaultStatus = admissionStatus === 'admitted' ? 'active' : 'inactive';

    return new StudentEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      admissionNumber: props.admissionNumber,
      firstName: props.firstName,
      middleName: props.middleName,
      lastName: props.lastName,
      dateOfBirth: props.dateOfBirth,
      gender: props.gender,
      phone: props.phone,
      email: props.email,
      address: props.address,
      city: props.city,
      state: props.state,
      postalCode: props.postalCode,
      admissionDate: props.admissionDate || (admissionStatus === 'admitted' ? now : null),
      admissionStatus,
      status: props.status || defaultStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute a Student entity from persistence layer.
   */
  public static from(props: StudentProps): StudentEntity {
    return new StudentEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get admissionNumber(): string {
    return this._admissionNumber;
  }

  public get firstName(): string {
    return this._firstName;
  }

  public get middleName(): string | null {
    return this._middleName;
  }

  public get lastName(): string {
    return this._lastName;
  }

  /**
   * Computed display name getter.
   */
  public get displayName(): string {
    return [this._firstName, this._middleName, this._lastName].filter(Boolean).join(' ');
  }

  public get dateOfBirth(): DateOfBirth | null {
    return this._dateOfBirth;
  }

  public get gender(): StudentGender | null {
    return this._gender;
  }

  public get phone(): PhoneNumber | null {
    return this._phone;
  }

  public get email(): string | null {
    return this._email;
  }

  public get address(): string | null {
    return this._address;
  }

  public get city(): string | null {
    return this._city;
  }

  public get state(): string | null {
    return this._state;
  }

  public get postalCode(): string | null {
    return this._postalCode;
  }

  public get admissionDate(): Date | null {
    return this._admissionDate ? new Date(this._admissionDate.getTime()) : null;
  }

  public get admissionStatus(): StudentAdmissionStatus {
    return this._admissionStatus;
  }

  public get status(): StudentStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public get deletedAt(): Date | null {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : null;
  }

  // ── Domain Methods & Invariant Mutators ──────────────────────────────────────

  /**
   * Update personal profile information.
   */
  public updateProfile(props: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    dateOfBirth?: DateOfBirth | Date | string | null;
    gender?: StudentGender | null;
  }): void {
    let changed = false;

    if (props.firstName !== undefined) {
      const fn = StudentEntity.validateName(props.firstName, 'First name');
      if (this._firstName !== fn) {
        this._firstName = fn;
        changed = true;
      }
    }

    if (props.middleName !== undefined) {
      const mn = props.middleName ? StudentEntity.validateName(props.middleName, 'Middle name', true) : null;
      if (this._middleName !== mn) {
        this._middleName = mn;
        changed = true;
      }
    }

    if (props.lastName !== undefined) {
      const ln = StudentEntity.validateName(props.lastName, 'Last name');
      if (this._lastName !== ln) {
        this._lastName = ln;
        changed = true;
      }
    }

    if (props.dateOfBirth !== undefined) {
      const dob = props.dateOfBirth ? DateOfBirth.create(props.dateOfBirth) : null;
      const currentDobVal = this._dateOfBirth ? this._dateOfBirth.value : null;
      const newDobVal = dob ? dob.value : null;
      if (currentDobVal !== newDobVal) {
        this._dateOfBirth = dob;
        changed = true;
      }
    }

    if (props.gender !== undefined) {
      const g = props.gender ? StudentEntity.validateGender(props.gender) : null;
      if (this._gender !== g) {
        this._gender = g;
        changed = true;
      }
    }

    if (changed) {
      this._updatedAt = new Date();
    }
  }

  /**
   * Update contact details and physical address.
   */
  public updateContactAndAddress(props: {
    phone?: PhoneNumber | string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  }): void {
    let changed = false;

    if (props.phone !== undefined) {
      const ph = props.phone ? PhoneNumber.create(props.phone) : null;
      const curPh = this._phone ? this._phone.value : null;
      const newPh = ph ? ph.value : null;
      if (curPh !== newPh) {
        this._phone = ph;
        changed = true;
      }
    }

    if (props.email !== undefined) {
      const em = props.email ? StudentEntity.validateEmail(props.email) : null;
      if (this._email !== em) {
        this._email = em;
        changed = true;
      }
    }

    if (props.address !== undefined) {
      const addr = props.address ? props.address.trim() || null : null;
      if (this._address !== addr) {
        this._address = addr;
        changed = true;
      }
    }

    if (props.city !== undefined) {
      const c = props.city ? props.city.trim() || null : null;
      if (this._city !== c) {
        this._city = c;
        changed = true;
      }
    }

    if (props.state !== undefined) {
      const s = props.state ? props.state.trim() || null : null;
      if (this._state !== s) {
        this._state = s;
        changed = true;
      }
    }

    if (props.postalCode !== undefined) {
      const pc = props.postalCode ? props.postalCode.trim() || null : null;
      if (this._postalCode !== pc) {
        this._postalCode = pc;
        changed = true;
      }
    }

    if (changed) {
      this._updatedAt = new Date();
    }
  }

  /**
   * Transition admission status to "admitted" and set student status to "active".
   */
  public admit(admissionDate?: Date | string): void {
    const now = new Date();
    let admDate: Date;
    if (admissionDate) {
      admDate = admissionDate instanceof Date ? admissionDate : new Date(admissionDate);
      if (Number.isNaN(admDate.getTime())) {
        throw new ValidationError('Invalid admission date');
      }
    } else {
      admDate = now;
    }

    this._admissionStatus = 'admitted';
    this._admissionDate = admDate;
    this._status = 'active';
    this._updatedAt = now;
  }

  /**
   * Reject student admission.
   */
  public reject(): void {
    this._admissionStatus = 'rejected';
    this._status = 'inactive';
    this._updatedAt = new Date();
  }

  /**
   * Cancel student admission.
   */
  public cancel(): void {
    this._admissionStatus = 'cancelled';
    this._status = 'inactive';
    this._updatedAt = new Date();
  }

  /**
   * Activate student standing. Requires admissionStatus === 'admitted'.
   */
  public activate(): void {
    if (this._admissionStatus !== 'admitted') {
      throw new ValidationError(
        `Cannot activate student standing when admission status is "${this._admissionStatus}". Student must be admitted first.`,
      );
    }
    if (this._status === 'active') return;

    this._status = 'active';
    this._updatedAt = new Date();
  }

  /**
   * Deactivate student standing.
   */
  public deactivate(): void {
    if (this._status === 'inactive') return;

    this._status = 'inactive';
    this._updatedAt = new Date();
  }

  /**
   * Soft archive student record. Sets status to "archived" and deletedAt timestamp.
   */
  public archive(): void {
    const now = new Date();
    this._status = 'archived';
    this._deletedAt = now;
    this._updatedAt = now;
  }

  /**
   * Converts entity state to plain DTO representation.
   */
  public toDTO(): StudentDTO {
    return {
      id: this._id,
      instituteId: this._instituteId,
      admissionNumber: this._admissionNumber,
      firstName: this._firstName,
      middleName: this._middleName,
      lastName: this._lastName,
      displayName: this.displayName,
      dateOfBirth: this._dateOfBirth ? this._dateOfBirth.value : null,
      gender: this._gender,
      phone: this._phone ? this._phone.value : null,
      email: this._email,
      address: this._address,
      city: this._city,
      state: this._state,
      postalCode: this._postalCode,
      admissionDate: this._admissionDate ? this._admissionDate.toISOString() : null,
      admissionStatus: this._admissionStatus,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      deletedAt: this._deletedAt ? this._deletedAt.toISOString() : null,
    };
  }

  // ── Validation Helpers ─────────────────────────────────────────────────────

  private static validateName(val: string, fieldName: string, allowEmpty = false): string {
    if (val === undefined || val === null) {
      if (allowEmpty) return '';
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
    const trimmed = String(val).trim();
    if (!allowEmpty && trimmed === '') {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
    if (trimmed.length > 100) {
      throw new ValidationError(`${fieldName} cannot exceed 100 characters`);
    }
    return trimmed;
  }

  private static validateGender(gender: string): StudentGender {
    const validGenders: StudentGender[] = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!validGenders.includes(gender as StudentGender)) {
      throw new ValidationError(`Invalid gender: "${gender}"`);
    }
    return gender as StudentGender;
  }

  private static validateEmail(rawEmail: string): string {
    const trimmed = rawEmail.trim().toLowerCase();
    if (trimmed === '') return '';
    // Standard email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new ValidationError(`Invalid email address format: "${rawEmail}"`);
    }
    return trimmed;
  }

  private static validateAdmissionStatus(status?: string): StudentAdmissionStatus {
    const validStatuses: StudentAdmissionStatus[] = ['pending', 'admitted', 'rejected', 'cancelled'];
    if (!status || !validStatuses.includes(status as StudentAdmissionStatus)) {
      throw new ValidationError(`Invalid admission status: "${status}"`);
    }
    return status as StudentAdmissionStatus;
  }

  private static validateStudentStatus(status?: string): StudentStatus {
    const validStatuses: StudentStatus[] = ['active', 'inactive', 'archived'];
    if (!status || !validStatuses.includes(status as StudentStatus)) {
      throw new ValidationError(`Invalid student status: "${status}"`);
    }
    return status as StudentStatus;
  }
}
