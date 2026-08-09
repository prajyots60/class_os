import { serverConfig } from '@coaching-os/config';
import { logger } from './logger';

export interface RequestTimingMeta {
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  instituteId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Calculates high-precision monotonic duration in milliseconds using performance.now().
 */
export function measureRequestDuration(startTime: number): number {
  const duration = performance.now() - startTime;
  return Math.round(duration * 100) / 100;
}

/**
 * Standardized request lifecycle logger with slow request classification.
 */
export function logRequestCompleted(meta: RequestTimingMeta): void {
  const warnThresholdMs = serverConfig.SLOW_REQUEST_WARN_MS || 500;
  const errorThresholdMs = serverConfig.SLOW_REQUEST_ERROR_MS || 2000;

  const logPayload = {
    requestId: meta.requestId,
    method: meta.method,
    route: meta.route,
    statusCode: meta.statusCode,
    durationMs: meta.durationMs,
    ...(meta.instituteId ? { instituteId: meta.instituteId } : {}),
    ...(meta.userId ? { userId: meta.userId } : {}),
  };

  if (meta.durationMs >= errorThresholdMs) {
    logger.warn(
      {
        ...logPayload,
        event: 'http.request.critical_slow',
        thresholdMs: errorThresholdMs,
      },
      `Critical Slow Request: ${meta.method} ${meta.route} took ${meta.durationMs}ms`,
    );
  } else if (meta.durationMs >= warnThresholdMs) {
    logger.warn(
      {
        ...logPayload,
        event: 'http.request.slow',
        thresholdMs: warnThresholdMs,
      },
      `Slow Request Detected: ${meta.method} ${meta.route} took ${meta.durationMs}ms`,
    );
  } else {
    logger.info(
      {
        ...logPayload,
        event: 'http.request.completed',
      },
      `HTTP Request Completed: ${meta.method} ${meta.route} [${meta.statusCode}] ${meta.durationMs}ms`,
    );
  }
}
