import { serverConfig } from '@coaching-os/config';

/**
 * Test Database Safety Guard
 *
 * FAILS CLOSED to prevent accidental execution of integration tests or reset commands
 * against the primary development or production database.
 */
export function validateTestEnvironment(): { testDatabaseUrl: string } {
  // Ensure test mode is explicitly enabled
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== 'test') {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  }

  const testDbUrl = process.env.TEST_DATABASE_URL || serverConfig.TEST_DATABASE_URL;

  if (!testDbUrl || testDbUrl.trim().length === 0) {
    throw new Error(
      '❌ SAFETY GUARD TRIGGERED: TEST_DATABASE_URL is missing in environment.\n' +
        'Integration tests must run against a dedicated test database to prevent data loss.',
    );
  }

  const mainDbUrl = process.env.DATABASE_URL || serverConfig.DATABASE_URL;

  if (testDbUrl.trim() === mainDbUrl.trim()) {
    throw new Error(
      '❌ SAFETY GUARD TRIGGERED: TEST_DATABASE_URL matches primary DATABASE_URL!\n' +
        'Integration tests cannot run against the primary development/production database.',
    );
  }

  if (!testDbUrl.includes('test') && !testDbUrl.includes('_test')) {
    throw new Error(
      `❌ SAFETY GUARD TRIGGERED: TEST_DATABASE_URL does not contain "test" or "_test".\n` +
        `Refusing to execute tests against database URL: ${testDbUrl.replace(/:[^:@]+@/, ':****@')}`,
    );
  }

  return { testDatabaseUrl: testDbUrl.trim() };
}
