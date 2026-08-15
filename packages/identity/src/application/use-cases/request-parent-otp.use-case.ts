import crypto from 'node:crypto';
import { logger } from '@coaching-os/observability';
import { ValidationError } from '@coaching-os/shared';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import type { OTPVerificationRepository } from '../../domain/repositories/otp-verification.repository';
import { getOTPProvider, type OTPProvider } from '../../domain/services/otp-provider.service';

export interface RequestParentOTPCommand {
  phone: string;
}

export interface RequestParentOTPResponse {
  success: boolean;
  message: string;
}

const OTP_SALT = process.env.OTP_SECRET || 'coachingos-parent-otp-salt-key';

export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(`${otp}:${OTP_SALT}`).digest('hex');
}

export class RequestParentOTPUseCase {
  constructor(
    private readonly otpVerificationRepo: OTPVerificationRepository,
    private readonly otpProvider: OTPProvider = getOTPProvider(),
  ) {}

  public async execute(command: RequestParentOTPCommand): Promise<RequestParentOTPResponse> {
    if (!command || !command.phone || typeof command.phone !== 'string') {
      throw new ValidationError('Phone number is required and must be a non-empty string.');
    }

    const phoneVO = PhoneNumber.create(command.phone);

    // OTP Generation
    let otp: string;
    if (process.env.NODE_ENV === 'production') {
      otp = crypto.randomInt(100000, 999999).toString();
    } else {
      otp = '123456';
    }

    const hash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    await this.otpVerificationRepo.saveOTP(phoneVO, hash, expiresAt);
    await this.otpProvider.sendOTP({ phone: phoneVO.value, otp });

    logger.info(
      {
        phone: phoneVO.value.slice(0, 4) + '****' + phoneVO.value.slice(-2),
        operation: 'identity.parent.otp.requested',
      },
      'identity.parent.otp.requested',
    );

    return {
      success: true,
      message: 'OTP sent successfully.',
    };
  }
}
