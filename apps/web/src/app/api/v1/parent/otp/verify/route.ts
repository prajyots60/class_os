import { type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  PrismaParentIdentityRepository,
  PrismaOTPVerificationRepository,
  VerifyParentOTPUseCase,
} from '@coaching-os/identity';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiSuccess,
  handleV1Error,
  methodNotAllowed,
} from '../../../_lib/v1-guard';
import { assertMutationRateLimit } from '../../../_lib/rate-limiter';

import { signSessionToken } from '@coaching-os/auth';

const verifyOtpSchema = z
  .object({
    phone: z.string().min(1, 'Phone number is required.'),
    otp: z.string().length(6, 'OTP must be exactly 6 numeric digits.'),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    assertMutationRateLimit(req);

    const body = await req.json();
    const validated = verifyOtpSchema.parse(body);

    const parentRepo = new PrismaParentIdentityRepository();
    const otpRepo = new PrismaOTPVerificationRepository();
    const useCase = new VerifyParentOTPUseCase(parentRepo, otpRepo);

    const result = await useCase.execute({
      phone: validated.phone,
      otp: validated.otp,
    });

    const response = apiSuccess(result, requestId);
    const signedToken = signSessionToken(result.session.token);
    response.cookies.set('better-auth.session_token', signedToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2592000, // 30 days
    });

    return response;
  } catch (error) {
    return handleV1Error(error, requestId);
  }
}

export async function GET() {
  return methodNotAllowed(['POST']);
}

export async function PUT() {
  return methodNotAllowed(['POST']);
}

export async function PATCH() {
  return methodNotAllowed(['POST']);
}

export async function DELETE() {
  return methodNotAllowed(['POST']);
}
