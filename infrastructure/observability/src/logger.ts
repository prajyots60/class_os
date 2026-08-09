import pino from 'pino';
import { serverConfig } from '@coaching-os/config';

// Sensitive field redaction baseline for CoachingOS
export const SENSITIVE_FIELDS_REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'authorization',
  'cookie',
  'set-cookie',
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'apiKey',
  'secret',
  'otp',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.sessionToken',
  '*.cookie',
  '*.authorization',
  '*.secret',
  '*.otp',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

export const basePinoInstance = pino({
  level: serverConfig.NODE_ENV === 'test' ? 'silent' : serverConfig.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    service: 'coaching-os',
    environment: serverConfig.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: SENSITIVE_FIELDS_REDACT_PATHS,
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

export interface LogContext {
  requestId?: string;
  instituteId?: string;
  userId?: string;
  operation?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export class CoachingOSLogger {
  constructor(private pinoInstance: pino.Logger = basePinoInstance) {}

  debug(msg: string, context?: LogContext): void;
  debug(context: LogContext, msg: string): void;
  debug(contextOrMsg: LogContext | string, msgOrContext?: LogContext | string): void {
    if (typeof contextOrMsg === 'string') {
      this.pinoInstance.debug(msgOrContext || {}, contextOrMsg);
    } else {
      this.pinoInstance.debug(contextOrMsg || {}, (msgOrContext as string) || '');
    }
  }

  info(msg: string, context?: LogContext): void;
  info(context: LogContext, msg: string): void;
  info(contextOrMsg: LogContext | string, msgOrContext?: LogContext | string): void {
    if (typeof contextOrMsg === 'string') {
      this.pinoInstance.info(msgOrContext || {}, contextOrMsg);
    } else {
      this.pinoInstance.info(contextOrMsg || {}, (msgOrContext as string) || '');
    }
  }

  warn(msg: string, context?: LogContext): void;
  warn(context: LogContext, msg: string): void;
  warn(contextOrMsg: LogContext | string, msgOrContext?: LogContext | string): void {
    if (typeof contextOrMsg === 'string') {
      this.pinoInstance.warn(msgOrContext || {}, contextOrMsg);
    } else {
      this.pinoInstance.warn(contextOrMsg || {}, (msgOrContext as string) || '');
    }
  }

  error(msg: string, context?: LogContext): void;
  error(context: LogContext, msg: string): void;
  error(contextOrMsg: LogContext | string, msgOrContext?: LogContext | string): void {
    if (typeof contextOrMsg === 'string') {
      this.pinoInstance.error(msgOrContext || {}, contextOrMsg);
    } else {
      this.pinoInstance.error(contextOrMsg || {}, (msgOrContext as string) || '');
    }
  }

  fatal(msg: string, context?: LogContext): void;
  fatal(context: LogContext, msg: string): void;
  fatal(contextOrMsg: LogContext | string, msgOrContext?: LogContext | string): void {
    if (typeof contextOrMsg === 'string') {
      this.pinoInstance.fatal(msgOrContext || {}, contextOrMsg);
    } else {
      this.pinoInstance.fatal(contextOrMsg || {}, (msgOrContext as string) || '');
    }
  }

  child(bindings: LogContext): CoachingOSLogger {
    return new CoachingOSLogger(this.pinoInstance.child(bindings));
  }
}

export const logger = new CoachingOSLogger();
