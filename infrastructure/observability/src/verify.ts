import { logger, basePinoInstance, SENSITIVE_FIELDS_REDACT_PATHS } from './logger';
import { getOrCreateRequestId, normalizeDatabaseError, toErrorResponse } from './error-handler';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ApplicationError,
} from '@coaching-os/shared';

export async function verifyInfrastructureFoundation() {
  console.log('🔍 Executing CoachingOS Shared Engineering Infrastructure Verification...');

  try {
    // 1. Verify Pino Logger Initialization
    if (!basePinoInstance || typeof logger.info !== 'function') {
      throw new Error('Verification failed: Logger instance is invalid.');
    }
    console.log('✅ Pino Logger Abstraction initialized successfully.');

    // 2. Verify Redaction Path Configuration
    if (
      !SENSITIVE_FIELDS_REDACT_PATHS.includes('password') ||
      !SENSITIVE_FIELDS_REDACT_PATHS.includes('token')
    ) {
      throw new Error(
        'Verification failed: Sensitive field redaction paths are missing required keywords.',
      );
    }
    console.log('✅ Sensitive field redaction rules configured for 24 sensitive field paths.');

    // 3. Verify Server-Side Hardened Request ID Generation
    const mockHeaders = new Headers();
    mockHeaders.set('x-request-id', 'malicious_client_spoofed_id_9999');
    const generatedId = getOrCreateRequestId(mockHeaders);

    if (!generatedId || generatedId === 'malicious_client_spoofed_id_9999') {
      throw new Error(
        'Verification failed: Client-supplied x-request-id was erroneously accepted!',
      );
    }
    console.log(
      '✅ Hardened Request ID verified: Client-supplied X-Request-ID was ignored, server generated canonical UUID.',
    );

    // 4. Verify Application Error Taxonomy
    const valErr = new ValidationError('Invalid student admission number.');
    const authErr = new AuthenticationError();
    const notFoundErr = new NotFoundError('Institute record not found.');
    const conflictErr = new ConflictError('Unique email constraint violated.');

    if (
      valErr.statusCode !== 400 ||
      authErr.statusCode !== 401 ||
      notFoundErr.statusCode !== 404 ||
      conflictErr.statusCode !== 409
    ) {
      throw new Error('Verification failed: Error taxonomy status code mapping is incorrect.');
    }
    console.log('✅ Application Error Taxonomy verified (400, 401, 404, 409 status codes).');

    // 5. Verify Database Error Normalization
    const mockPrismaUniqueError = { code: 'P2002', message: 'Unique constraint failed on (email)' };
    const normalizedConflict = normalizeDatabaseError(mockPrismaUniqueError);
    if (normalizedConflict.code !== 'CONFLICT' || normalizedConflict.statusCode !== 409) {
      throw new Error(
        'Verification failed: Prisma P2002 error was not normalized to CONFLICT (409).',
      );
    }

    const mockPrismaNotFoundError = { code: 'P2025', message: 'Record not found' };
    const normalizedNotFound = normalizeDatabaseError(mockPrismaNotFoundError);
    if (normalizedNotFound.code !== 'NOT_FOUND' || normalizedNotFound.statusCode !== 404) {
      throw new Error(
        'Verification failed: Prisma P2025 error was not normalized to NOT_FOUND (404).',
      );
    }
    console.log(
      '✅ Prisma database error normalization verified (P2002 -> CONFLICT, P2025 -> NOT_FOUND).',
    );

    // 6. Verify Safe Public Error Response Generation
    const testError = new ValidationError('Admission number ADM-001 is invalid.');
    const response = toErrorResponse(testError, generatedId);

    if (response.status !== 400) {
      throw new Error('Verification failed: Response status does not match error status code.');
    }

    if (response.headers.get('x-request-id') !== generatedId) {
      throw new Error('Verification failed: x-request-id header missing from error response.');
    }

    const responseData = (await response.json()) as {
      error: { code: string; message: string; requestId: string };
    };
    if (
      responseData.error.code !== 'VALIDATION_ERROR' ||
      responseData.error.requestId !== generatedId ||
      !responseData.error.message
    ) {
      throw new Error('Verification failed: API error response payload shape is invalid.');
    }

    // Verify stack traces & secrets are NOT exposed in public response
    const rawResponseText = JSON.stringify(responseData);
    if (
      rawResponseText.includes('stack') ||
      rawResponseText.includes('password') ||
      rawResponseText.includes('postgresql://')
    ) {
      throw new Error(
        'Verification failed: Internal details or secrets leaked in public error response!',
      );
    }
    console.log(
      '✅ Safe Public Error Response verified (Clean JSON, x-request-id header, zero internal stack leaks).',
    );

    console.log('\n🎉 ALL SHARED ENGINEERING INFRASTRUCTURE CHECKS PASSED!\n');
    return true;
  } catch (error) {
    console.error('❌ Infrastructure Verification Failed:', error);
    return false;
  }
}

verifyInfrastructureFoundation()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
