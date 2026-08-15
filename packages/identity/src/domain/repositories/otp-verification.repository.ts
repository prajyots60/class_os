import type { PhoneNumber } from '../value-objects/phone-number.vo';

export interface OTPVerificationRecord {
  id: string;
  phone: string;
  hash: string;
  attempts: number;
  lastAttemptAt: Date;
  expiresAt: Date;
  rawValue: string;
}

export interface OTPVerificationRepository {
  /**
   * Persist a new OTP verification record for a phone number.
   * Clears any existing pending records for this phone number first.
   */
  saveOTP(phone: PhoneNumber | string, hash: string, expiresAt: Date): Promise<OTPVerificationRecord>;

  /**
   * Look up the active OTP verification record for a phone number.
   */
  getOTP(phone: PhoneNumber | string): Promise<OTPVerificationRecord | null>;

  /**
   * Atomically increment the verification attempt count for a record.
   */
  incrementAttempts(id: string, currentRecord: OTPVerificationRecord): Promise<number>;

  /**
   * Delete an active OTP verification record by phone number.
   */
  deleteByPhone(phone: PhoneNumber | string): Promise<void>;

  /**
   * Atomically consume (delete) an active OTP verification record by ID and raw value string.
   * Returns true if deleted successfully, false if already consumed by a concurrent request.
   */
  consumeOTP(id: string, rawValue: string): Promise<boolean>;
}
