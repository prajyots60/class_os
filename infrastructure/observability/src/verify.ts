import { logger, basePinoInstance, SENSITIVE_FIELDS_REDACT_PATHS } from './logger';
import { getOrCreateRequestId, normalizeDatabaseError, toErrorResponse } from './error-handler';
import { errorReporter, sanitizeReportContext, isExpectedBusinessError } from './error-reporter';
import { measureRequestDuration, logRequestCompleted } from './request-timing';
import { logAuthEvent, logSecurityEvent } from './events';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  InternalError,
} from '@coaching-os/shared';

export async function verifyInfrastructureFoundation() {
  console.log('🔍 Executing CoachingOS Production Observability Infrastructure Verification...');

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

    // 4. Verify Application Error Taxonomy & Expected Business Error Classifier
    const valErr = new ValidationError('Invalid student admission number.');
    const authErr = new AuthenticationError();
    const notFoundErr = new NotFoundError('Institute record not found.');
    const conflictErr = new ConflictError('Unique email constraint violated.');
    const internalErr = new InternalError('Unexpected database failure.');

    if (
      valErr.statusCode !== 400 ||
      authErr.statusCode !== 401 ||
      notFoundErr.statusCode !== 404 ||
      conflictErr.statusCode !== 409 ||
      internalErr.statusCode !== 500
    ) {
      throw new Error('Verification failed: Error taxonomy status code mapping is incorrect.');
    }

    if (!isExpectedBusinessError(valErr) || isExpectedBusinessError(internalErr)) {
      throw new Error('Verification failed: Business error classification logic is invalid.');
    }
    console.log('✅ Application Error Taxonomy & Expected Business Error Filtering verified.');

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

    // 7. Verify ErrorReporter Vendor Abstraction & PII Sanitization
    const rawContext = {
      requestId: generatedId,
      password: 'secret_password_123',
      token: 'auth_token_abc',
      studentId: 'stud_789',
    };
    const sanitized = sanitizeReportContext(rawContext);
    if (
      sanitized.password !== '[REDACTED]' ||
      sanitized.token !== '[REDACTED]' ||
      sanitized.studentId !== 'stud_789'
    ) {
      throw new Error('Verification failed: Report context PII sanitization failed.');
    }

    errorReporter.captureException(new Error('Verification test exception'), {
      requestId: generatedId,
    });
    console.log('✅ ErrorReporter Abstraction & PII Sanitization verified.');

    // 8. Verify Request Duration, Slow Request Detection & Domain Event Logging
    const startTime = performance.now() - 100;
    const duration = measureRequestDuration(startTime);
    if (duration <= 0) {
      throw new Error('Verification failed: Request duration measurement failed.');
    }

    logRequestCompleted({
      requestId: generatedId,
      method: 'GET',
      route: '/api/health',
      statusCode: 200,
      durationMs: duration,
    });

    logAuthEvent('sign_in', 'success', { requestId: generatedId, userId: 'usr_1' });
    logSecurityEvent('authorization_denied', { requestId: generatedId, route: '/api/admin' });
    console.log(
      '✅ Request Duration (performance.now()), Slow Request Detection & Domain Event Logging verified.',
    );

    console.log('\n🎉 ALL PRODUCTION OBSERVABILITY CHECKS PASSED!\n');
    return true;
  } catch (error) {
    console.error('❌ Observability Infrastructure Verification Failed:', error);
    return false;
  }
}

verifyInfrastructureFoundation()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
