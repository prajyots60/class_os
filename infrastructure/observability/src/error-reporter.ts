import { serverConfig } from '@coaching-os/config';
import { ApplicationError } from '@coaching-os/shared';
import { logger } from './logger';

export interface ErrorReportContext {
  requestId?: string;
  instituteId?: string;
  userId?: string;
  parentIdentityId?: string;
  studentId?: string;
  batchId?: string;
  enrollmentId?: string;
  invoiceId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export interface ErrorReporter {
  captureException(error: unknown, context?: ErrorReportContext): void;
  captureMessage(
    message: string,
    level?: 'info' | 'warn' | 'error',
    context?: ErrorReportContext,
  ): void;
  setUser(user: { id: string; role?: string } | null): void;
  setContext(name: string, data: Record<string, unknown>): void;
}

/**
 * Sanitizes arbitrary context objects to prevent leaking PII or credentials.
 * Keeps operational metadata (UUIDs, status codes, routes) while stripping sensitive values.
 */
export function sanitizeReportContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};

  const sensitiveKeys = new Set([
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'sessionToken',
    'authorization',
    'cookie',
    'set-cookie',
    'otp',
    'secret',
    'apiKey',
    'DATABASE_URL',
    'TEST_DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'creditCard',
    'cardNumber',
    'cvv',
  ]);

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveKeys.has(key) || sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeReportContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Determines whether an error represents an expected business error vs an unexpected exception.
 * Expected errors (4xx validation, auth, not found, conflicts) should NOT trigger external error reports.
 */
export function isExpectedBusinessError(error: unknown): boolean {
  if (error instanceof ApplicationError) {
    // Status codes below 500 are expected business conditions
    return error.statusCode < 500;
  }
  return false;
}

/**
 * Production-ready, vendor-agnostic Pino error reporter implementation.
 * Logs unexpected exceptions structured via Pino while respecting test mode isolation.
 */
export class PinoErrorReporter implements ErrorReporter {
  private currentUser: { id: string; role?: string } | null = null;
  private currentContext: Record<string, unknown> = {};

  captureException(error: unknown, context?: ErrorReportContext): void {
    if (serverConfig.NODE_ENV === 'test') {
      return;
    }

    // Do not treat expected 4xx business conditions as external error events
    if (isExpectedBusinessError(error)) {
      const appErr = error as ApplicationError;
      logger.info(
        {
          event: 'business_error.occurred',
          code: appErr.code,
          statusCode: appErr.statusCode,
          ...sanitizeReportContext({
            ...this.currentContext,
            ...context,
            userId: this.currentUser?.id || context?.userId,
          }),
        },
        `Expected domain condition: ${appErr.publicMessage}`,
      );
      return;
    }

    const sanitizedCtx = sanitizeReportContext({
      ...this.currentContext,
      ...context,
      userId: this.currentUser?.id || context?.userId,
    });

    const errMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      {
        event: 'exception.uncaught',
        err: error,
        ...sanitizedCtx,
      },
      `Unexpected Exception: ${errMessage}`,
    );
  }

  captureMessage(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
    context?: ErrorReportContext,
  ): void {
    if (serverConfig.NODE_ENV === 'test') {
      return;
    }

    const sanitizedCtx = sanitizeReportContext({
      ...this.currentContext,
      ...context,
      userId: this.currentUser?.id || context?.userId,
    });

    logger[level](
      {
        event: 'system.message',
        ...sanitizedCtx,
      },
      message,
    );
  }

  setUser(user: { id: string; role?: string } | null): void {
    this.currentUser = user;
  }

  setContext(name: string, data: Record<string, unknown>): void {
    this.currentContext[name] = sanitizeReportContext(data);
  }
}

/**
 * Global ErrorReporter instance.
 * Decouples application code from vendor-specific error tracking SDKs.
 */
export const errorReporter: ErrorReporter = new PinoErrorReporter();
