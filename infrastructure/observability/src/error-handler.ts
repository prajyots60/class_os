import {
  ApplicationError,
  ApiErrorResponse,
  InternalError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@coaching-os/shared';
import { logger } from './logger';

/**
 * Generates an authoritative server-side request correlation ID.
 * Client-supplied headers are intentionally ignored to prevent log correlation spoofing.
 */
export function generateRequestId(_headers?: Headers): string {
  return crypto.randomUUID();
}

export const getOrCreateRequestId = generateRequestId;

/**
 * Normalizes Prisma & database errors into safe ApplicationErrors.
 * Prevents leaking database schemas, SQL, or internal driver traces to clients.
 */
export function normalizeDatabaseError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    // Prisma Known Request Errors
    if (err.code === 'P2002') {
      return new ConflictError('A record with matching unique fields already exists.');
    }
    if (err.code === 'P2025') {
      return new NotFoundError('The requested database record was not found.');
    }
    if (err.code === 'P2003') {
      return new ValidationError('Referenced record does not exist.');
    }
  }

  return new InternalError('An unexpected internal server error occurred.');
}

/**
 * Centralized HTTP error handler converting exceptions to safe API responses.
 * Logs full error details server-side while returning redacted public payloads to clients.
 */
export function toErrorResponse(
  error: unknown,
  requestId: string,
  logContext?: Record<string, unknown>,
): Response {
  const normalizedError = normalizeDatabaseError(error);

  // Server-side structured error log (full details)
  logger.error(
    {
      err: error,
      code: normalizedError.code,
      statusCode: normalizedError.statusCode,
      requestId,
      ...logContext,
    },
    `API Error: ${normalizedError.publicMessage}`,
  );

  const responseBody: ApiErrorResponse = {
    error: {
      code: normalizedError.code,
      message: normalizedError.publicMessage,
      requestId,
      ...(normalizedError.details ? { details: normalizedError.details } : {}),
    },
  };

  return Response.json(responseBody, {
    status: normalizedError.statusCode,
    headers: {
      'x-request-id': requestId,
    },
  });
}
