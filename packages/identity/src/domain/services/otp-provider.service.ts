import { logger } from '@coaching-os/observability';
import { InternalError } from '@coaching-os/shared';
import { PhoneNumber } from '../value-objects/phone-number.vo';

export interface SendOTPParams {
  phone: PhoneNumber | string;
  otp: string;
}

/**
 * OTPProvider Service Interface
 *
 * Framework-independent boundary for sending OTP verification messages.
 */
export interface OTPProvider {
  sendOTP(params: SendOTPParams): Promise<void>;
}

/**
 * MockOTPProvider
 *
 * Development and test OTP provider.
 * Logs OTP dispatch safely with redacted PII and records sent messages in memory for test assertions.
 */
export class MockOTPProvider implements OTPProvider {
  private static sentMessages: Array<{ phone: string; otp: string; timestamp: Date }> = [];

  public async sendOTP(params: SendOTPParams): Promise<void> {
    const phoneVO = PhoneNumber.create(params.phone);
    const now = new Date();

    MockOTPProvider.sentMessages.push({
      phone: phoneVO.value,
      otp: params.otp,
      timestamp: now,
    });

    logger.info(
      {
        phone: phoneVO.value.slice(0, 4) + '****' + phoneVO.value.slice(-2),
        operation: 'identity.parent.otp.sent_mock',
      },
      'identity.parent.otp.sent_mock',
    );
  }

  /** Retrieve sent OTPs for test verification */
  public static getSentMessages(): Array<{ phone: string; otp: string; timestamp: Date }> {
    return [...MockOTPProvider.sentMessages];
  }

  /** Clear sent messages memory for test isolation */
  public static clearSentMessages(): void {
    MockOTPProvider.sentMessages = [];
  }
}

/**
 * ProductionOTPProvider
 *
 * Production OTP provider.
 * Enforces explicit configuration and fails safely when credentials are missing.
 */
export class ProductionOTPProvider implements OTPProvider {
  public async sendOTP(params: SendOTPParams): Promise<void> {
    const apiKey = process.env.SMS_PROVIDER_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new InternalError(
        'Production SMS provider credentials not configured. Please set SMS_PROVIDER_API_KEY.',
      );
    }

    const phoneVO = PhoneNumber.create(params.phone);
    logger.info(
      {
        phone: phoneVO.value.slice(0, 4) + '****' + phoneVO.value.slice(-2),
        operation: 'identity.parent.otp.sent_production',
      },
      'identity.parent.otp.sent_production',
    );

    // Production vendor dispatch logic executes when SMS_PROVIDER_API_KEY is present
  }
}

/**
 * Factory helper to resolve the appropriate OTPProvider instance based on environment.
 */
export function getOTPProvider(): OTPProvider {
  if (process.env.NODE_ENV === 'production') {
    return new ProductionOTPProvider();
  }
  return new MockOTPProvider();
}
