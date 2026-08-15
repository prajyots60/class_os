import { db } from '@coaching-os/database';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import type {
  OTPVerificationRecord,
  OTPVerificationRepository,
} from '../../domain/repositories/otp-verification.repository';

export class PrismaOTPVerificationRepository implements OTPVerificationRepository {
  private getIdentifier(phone: PhoneNumber | string): string {
    const phoneVO = PhoneNumber.create(phone);
    return `otp:${phoneVO.value}`;
  }

  public async saveOTP(
    phone: PhoneNumber | string,
    hash: string,
    expiresAt: Date,
  ): Promise<OTPVerificationRecord> {
    const phoneVO = PhoneNumber.create(phone);
    const identifier = this.getIdentifier(phoneVO);
    const now = new Date();

    // Clean up existing records for this identifier first
    await db.verification.deleteMany({
      where: { identifier },
    });

    const payload = JSON.stringify({
      hash,
      attempts: 0,
      lastAttemptAt: now.toISOString(),
    });

    const created = await db.verification.create({
      data: {
        identifier,
        value: payload,
        expiresAt,
      },
    });

    return {
      id: created.id,
      phone: phoneVO.value,
      hash,
      attempts: 0,
      lastAttemptAt: now,
      expiresAt: created.expiresAt,
      rawValue: created.value,
    };
  }

  public async getOTP(phone: PhoneNumber | string): Promise<OTPVerificationRecord | null> {
    const phoneVO = PhoneNumber.create(phone);
    const identifier = this.getIdentifier(phoneVO);

    const record = await db.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return null;
    }

    try {
      const parsed = JSON.parse(record.value) as {
        hash: string;
        attempts: number;
        lastAttemptAt: string;
      };
      return {
        id: record.id,
        phone: phoneVO.value,
        hash: parsed.hash,
        attempts: parsed.attempts ?? 0,
        lastAttemptAt: parsed.lastAttemptAt ? new Date(parsed.lastAttemptAt) : record.createdAt,
        expiresAt: record.expiresAt,
        rawValue: record.value,
      };
    } catch {
      return null;
    }
  }

  public async incrementAttempts(
    id: string,
    currentRecord: OTPVerificationRecord,
  ): Promise<number> {
    const newAttempts = currentRecord.attempts + 1;
    const now = new Date();

    const newPayload = JSON.stringify({
      hash: currentRecord.hash,
      attempts: newAttempts,
      lastAttemptAt: now.toISOString(),
    });

    await db.verification.update({
      where: { id },
      data: {
        value: newPayload,
      },
    });

    return newAttempts;
  }

  public async deleteByPhone(phone: PhoneNumber | string): Promise<void> {
    const identifier = this.getIdentifier(phone);
    await db.verification.deleteMany({
      where: { identifier },
    });
  }

  public async consumeOTP(id: string, rawValue: string): Promise<boolean> {
    // Atomic delete: deletes if and only if id and exact value match
    const result = await db.verification.deleteMany({
      where: {
        id,
        value: rawValue,
      },
    });
    return result.count > 0;
  }
}
