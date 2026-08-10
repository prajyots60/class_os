import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  onboardInstituteSchema,
  OnboardInstituteUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaOnboardInstituteRepository,
  PrismaInstituteRepository,
  PrismaInstituteMembershipRepository,
  type OnboardInstituteCommand,
} from '@coaching-os/identity';
import { AuthenticationError, ValidationError } from '@coaching-os/shared';
import { getOrCreateRequestId, toErrorResponse } from '@coaching-os/observability';

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    // 1. Authenticate session from trusted server-side session boundary
    const session = await getAuthenticatedSession(req.headers);
    if (!session || !session.user) {
      throw new AuthenticationError('Valid authentication session is required for onboarding.');
    }

    // 2. Parse JSON request body safely
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON payload.');
    }

    // 3. Validate client input using onboardInstituteSchema
    const parseResult = onboardInstituteSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid onboarding payload parameters.', fieldErrors);
    }

    const { name, phone, email, timezone, slug, logoUrl, primaryColor } = parseResult.data;

    // 4. Construct OnboardInstituteCommand with SERVER-CONTROLLED identity authority
    const command: OnboardInstituteCommand = {
      authenticatedUserId: session.user.id,
      name,
      phone,
      email,
      timezone,
      slug,
      logoUrl,
      primaryColor,
    };

    // 5. Execute OnboardInstituteUseCase
    const onboardRepo = new PrismaOnboardInstituteRepository();
    const instituteRepo = new PrismaInstituteRepository();
    const onboardUseCase = new OnboardInstituteUseCase(onboardRepo, instituteRepo);

    const onboardingResult = await onboardUseCase.execute(command);

    // 6. Resolve post-onboarding TenantContext using ResolveInstituteMembershipUseCase
    const membershipRepo = new PrismaInstituteMembershipRepository();
    const resolveMembershipUseCase = new ResolveInstituteMembershipUseCase(membershipRepo);

    const tenantContext = await resolveMembershipUseCase.execute({
      userId: session.user.id,
      requestedInstituteId: onboardingResult.institute.id,
    });

    // 7. Return safe 201 Created DTO response
    return NextResponse.json(
      {
        success: true,
        data: {
          institute: {
            id: onboardingResult.institute.id,
            name: onboardingResult.institute.name,
            slug: onboardingResult.institute.slug,
            phone: onboardingResult.institute.phone,
            email: onboardingResult.institute.email,
            timezone: onboardingResult.institute.timezone,
            logoUrl: onboardingResult.institute.logoUrl,
            primaryColor: onboardingResult.institute.primaryColor,
            status: onboardingResult.institute.status,
            createdAt: onboardingResult.institute.createdAt,
            updatedAt: onboardingResult.institute.updatedAt,
          },
          tenantContext: {
            userId: tenantContext.userId,
            instituteId: tenantContext.instituteId,
            membershipId: tenantContext.membershipId,
            role: tenantContext.role,
            status: tenantContext.status,
          },
        },
      },
      {
        status: 201,
        headers: {
          'x-request-id': requestId,
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function GET() {
  return methodNotAllowedResponse();
}

export async function PUT() {
  return methodNotAllowedResponse();
}

export async function PATCH() {
  return methodNotAllowedResponse();
}

export async function DELETE() {
  return methodNotAllowedResponse();
}

function methodNotAllowedResponse() {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'HTTP method not allowed.',
      },
    },
    {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    },
  );
}
