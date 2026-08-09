import { serverConfig } from '@coaching-os/config';
import { logger } from './logger';
import { errorReporter } from './error-reporter';

let processHandlersRegistered = false;

/**
 * Registers process-level exception handlers for uncaught exceptions and unhandled promise rejections.
 * Ensures fatal errors are logged safely and captured by ErrorReporter without crashing unit tests.
 */
export function registerProcessErrorHandlers(): void {
  if (processHandlersRegistered || serverConfig.NODE_ENV === 'test') {
    return;
  }

  process.on('uncaughtException', (error: Error) => {
    logger.fatal(
      {
        event: 'process.uncaught_exception',
        err: error,
      },
      `Fatal Uncaught Exception: ${error.message}`,
    );

    try {
      errorReporter.captureException(error, { route: 'process.uncaughtException' });
    } catch {
      // Prevent recursive process crashes during telemetry failure
    }
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));

    logger.error(
      {
        event: 'process.unhandled_rejection',
        err: error,
      },
      `Unhandled Promise Rejection: ${error.message}`,
    );

    try {
      errorReporter.captureException(error, { route: 'process.unhandledRejection' });
    } catch {
      // Prevent recursive process crashes during telemetry failure
    }
  });

  processHandlersRegistered = true;
}
