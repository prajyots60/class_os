import { describe, it, expect } from 'vitest';
import { logger, SENSITIVE_FIELDS_REDACT_PATHS } from './logger';
import { generateRequestId, normalizeDatabaseError, toErrorResponse } from './error-handler';
import { ValidationError, ConflictError, NotFoundError } from '@coaching-os/shared';

describe('Shared Infrastructure & Observability Suite', () => {
  it('initializes logger instance correctly', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('configures automated redaction for sensitive fields', () => {
    expect(SENSITIVE_FIELDS_REDACT_PATHS).toContain('password');
    expect(SENSITIVE_FIELDS_REDACT_PATHS).toContain('token');
    expect(SENSITIVE_FIELDS_REDACT_PATHS).toContain('cookie');
    expect(SENSITIVE_FIELDS_REDACT_PATHS).toContain('DATABASE_URL');
    expect(SENSITIVE_FIELDS_REDACT_PATHS).toContain('BETTER_AUTH_SECRET');
  });

  it('hardens request ID generation by ignoring client-supplied headers', () => {
    const mockHeaders = new Headers();
    mockHeaders.set('x-request-id', 'malicious_client_id_123');

    const canonicalId = generateRequestId(mockHeaders);
    expect(canonicalId).not.toBe('malicious_client_id_123');
    expect(canonicalId.length).toBeGreaterThan(20);
  });

  it('normalizes Prisma P2002 unique constraint error to ConflictError', () => {
    const prismaErr = { code: 'P2002', message: 'Unique constraint failed on (email)' };
    const normalized = normalizeDatabaseError(prismaErr);

    expect(normalized).toBeInstanceOf(ConflictError);
    expect(normalized.statusCode).toBe(409);
    expect(normalized.code).toBe('CONFLICT');
  });

  it('normalizes Prisma P2025 missing record error to NotFoundError', () => {
    const prismaErr = { code: 'P2025', message: 'Record to update not found' };
    const normalized = normalizeDatabaseError(prismaErr);

    expect(normalized).toBeInstanceOf(NotFoundError);
    expect(normalized.statusCode).toBe(404);
    expect(normalized.code).toBe('NOT_FOUND');
  });

  it('generates safe public API error response without leaking internal stack traces', async () => {
    const err = new ValidationError('Admission number ADM-001 is invalid.');
    const reqId = generateRequestId();

    const response = toErrorResponse(err, reqId);
    expect(response.status).toBe(400);
    expect(response.headers.get('x-request-id')).toBe(reqId);

    const body = (await response.json()) as {
      error: { code: string; message: string; requestId: string };
    };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Admission number ADM-001 is invalid.');
    expect(body.error.requestId).toBe(reqId);

    const rawJson = JSON.stringify(body);
    expect(rawJson).not.toContain('stack');
    expect(rawJson).not.toContain('postgresql://');
  });
});
