import { describe, it, expect, vi } from 'vitest';
import { ValidationError, NotFoundError, InternalError } from '@coaching-os/shared';
import {
  errorReporter,
  sanitizeReportContext,
  isExpectedBusinessError,
  measureRequestDuration,
  logRequestCompleted,
  logAuthEvent,
  logSecurityEvent,
} from './index';

describe('Production Observability Foundation Suite', () => {
  it('sanitizes sensitive field paths from report context', () => {
    const rawContext = {
      requestId: 'req_12345',
      instituteId: 'inst_789',
      password: 'super_secret_password_123',
      token: 'bearer_token_xyz',
      authorization: 'Bearer token_abc',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/coachingos',
      studentId: 'stud_456',
    };

    const sanitized = sanitizeReportContext(rawContext);

    expect(sanitized.requestId).toBe('req_12345');
    expect(sanitized.instituteId).toBe('inst_789');
    expect(sanitized.studentId).toBe('stud_456');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.DATABASE_URL).toBe('[REDACTED]');
  });

  it('correctly distinguishes expected domain conditions from unexpected exceptions', () => {
    const valErr = new ValidationError('Admission number is required.');
    const notFoundErr = new NotFoundError('Student profile not found.');
    const internalErr = new InternalError('Database connection pool exhausted.');
    const genericErr = new Error('Unexpected NullPointerException');

    expect(isExpectedBusinessError(valErr)).toBe(true);
    expect(isExpectedBusinessError(notFoundErr)).toBe(true);
    expect(isExpectedBusinessError(internalErr)).toBe(false);
    expect(isExpectedBusinessError(genericErr)).toBe(false);
  });

  it('measures monotonic request duration accurately using performance.now()', () => {
    const startTime = performance.now() - 150; // 150ms simulated duration
    const duration = measureRequestDuration(startTime);

    expect(duration).toBeGreaterThanOrEqual(140);
    expect(duration).toBeLessThanOrEqual(300);
  });

  it('executes ErrorReporter capturing without throwing exceptions', () => {
    expect(() => {
      errorReporter.setUser({ id: 'user_123', role: 'owner' });
      errorReporter.setContext('tenant', { instituteId: 'inst_abc' });
      errorReporter.captureException(new Error('Test unhandled runtime failure'), {
        route: '/api/test',
      });
      errorReporter.captureMessage('Operational system status update', 'info', {
        route: '/api/health',
      });
      errorReporter.setUser(null);
    }).not.toThrow();
  });

  it('executes structured auth and security event logging using domain.action.result conventions', () => {
    expect(() => {
      logAuthEvent('sign_in', 'success', { requestId: 'req_1', userId: 'user_1' });
      logAuthEvent('sign_in', 'failure', { requestId: 'req_2', reason: 'invalid_credentials' });
      logAuthEvent('sign_out', 'success', { requestId: 'req_3', userId: 'user_1' });
      logSecurityEvent('authorization_denied', {
        requestId: 'req_4',
        instituteId: 'inst_b',
        userId: 'user_malicious',
        route: '/api/billing',
      });
      logSecurityEvent('rate_limit_exceeded', { requestId: 'req_5', route: '/api/auth/sign-in' });
    }).not.toThrow();
  });

  it('logs request lifecycle and classifies request timing', () => {
    expect(() => {
      // Normal fast request (< 500ms)
      logRequestCompleted({
        requestId: 'req_fast',
        method: 'GET',
        route: '/api/students',
        statusCode: 200,
        durationMs: 45,
      });

      // Slow request (500ms - 2000ms)
      logRequestCompleted({
        requestId: 'req_slow',
        method: 'POST',
        route: '/api/attendance',
        statusCode: 200,
        durationMs: 750,
      });

      // Critical slow request (> 2000ms)
      logRequestCompleted({
        requestId: 'req_critical',
        method: 'GET',
        route: '/api/reports/annual',
        statusCode: 200,
        durationMs: 2500,
      });
    }).not.toThrow();
  });
});
