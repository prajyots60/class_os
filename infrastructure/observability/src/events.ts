import { logger } from './logger';

export type AuthAction = 'sign_in' | 'sign_out' | 'session_created' | 'session_revoked';
export type ActionResult = 'success' | 'failure';

export interface AuthEventContext {
  requestId?: string;
  userId?: string;
  instituteId?: string;
  reason?: string;
  [key: string]: unknown;
}

export type SecurityAction = 'authorization_denied' | 'rate_limit_exceeded' | 'suspicious_access';

export interface SecurityEventContext {
  requestId?: string;
  userId?: string;
  instituteId?: string;
  route?: string;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Standardized authentication event logger following domain.action.result naming conventions.
 * Logs operational security metadata while guaranteeing zero credential leaks.
 */
export function logAuthEvent(
  action: AuthAction,
  result: ActionResult,
  context: AuthEventContext = {},
): void {
  const eventName = `auth.${action}.${result}`;
  const logPayload = {
    event: eventName,
    ...(context.requestId ? { requestId: context.requestId } : {}),
    ...(context.userId ? { userId: context.userId } : {}),
    ...(context.instituteId ? { instituteId: context.instituteId } : {}),
    ...(context.reason ? { reason: context.reason } : {}),
  };

  if (result === 'failure') {
    logger.warn(logPayload, `Authentication Event: ${eventName}`);
  } else {
    logger.info(logPayload, `Authentication Event: ${eventName}`);
  }
}

/**
 * Standardized security event logger for authorization denials, rate limiting, and suspicious access.
 */
export function logSecurityEvent(action: SecurityAction, context: SecurityEventContext = {}): void {
  const eventName = `security.${action}`;
  const logPayload = {
    event: eventName,
    ...(context.requestId ? { requestId: context.requestId } : {}),
    ...(context.userId ? { userId: context.userId } : {}),
    ...(context.instituteId ? { instituteId: context.instituteId } : {}),
    ...(context.route ? { route: context.route } : {}),
    ...(context.reason ? { reason: context.reason } : {}),
  };

  logger.warn(logPayload, `Security Alert: ${eventName}`);
}
