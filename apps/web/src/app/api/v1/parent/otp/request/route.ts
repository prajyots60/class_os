import { type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  PrismaOTPVerificationRepository,
  RequestParentOTPUseCase,
} from '@coaching-os/identity';
import { generateRequestId } from '@coaching-os/observability';
import {
  apiSuccess,
  handleV1Error,
  methodNotAllowed,
} from '../../../_lib/v1-guard';
import { assertMutationRateLimit } from '../../../_lib/rate-limiter';

const requestOtpSchema = z
  .object({
    phone: z.string().min(1, 'Phone number is required.'),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    assertMutationRateLimit(req);

    const body = await req.json();
    const validated = requestOtpSchema.parse(body);

    const otpRepo = new PrismaOTPVerificationRepository();
    const useCase = new RequestParentOTPUseCase(otpRepo);

    const result = await useCase.execute({
      phone: validated.phone,
    });

    return apiSuccess(result, requestId);
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
