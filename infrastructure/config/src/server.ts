import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env file if running in Node server environment
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const serverSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required in root .env file.' })
    .min(1, 'DATABASE_URL cannot be empty.')
    .refine(
      (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
      'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql://',
    ),
  TEST_DATABASE_URL: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.startsWith('postgres://') || val.startsWith('postgresql://'),
      'TEST_DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql://',
    ),
  DIRECT_URL: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.startsWith('postgres://') || val.startsWith('postgresql://'),
      'DIRECT_URL must be a valid PostgreSQL connection string starting with postgresql://',
    ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('3000')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error('PORT must be a valid positive integer.');
      }
      return parsed;
    }),
  BETTER_AUTH_SECRET: z
    .string({ required_error: 'BETTER_AUTH_SECRET is required in root .env file.' })
    .min(32, 'BETTER_AUTH_SECRET must be a high-entropy string of at least 32 characters.'),
  BETTER_AUTH_URL: z
    .string()
    .url('BETTER_AUTH_URL must be a valid URL (e.g. http://localhost:3000)')
    .default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ERROR_TRACKING_DSN: z.string().optional(),
  SLOW_REQUEST_WARN_MS: z
    .string()
    .default('500')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  SLOW_REQUEST_ERROR_MS: z
    .string()
    .default('2000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  GIT_COMMIT_SHA: z.string().optional(),
});

export type ServerConfig = z.infer<typeof serverSchema>;

function validateServerConfig(): ServerConfig {
  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    const issueMessages = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('\n❌ SERVER ENVIRONMENT CONFIGURATION VALIDATION FAILED:');
    console.error(issueMessages);
    console.error('Please check your root .env file against .env.example.\n');

    throw new Error(`Server Environment Validation Failed:\n${issueMessages}`);
  }

  return result.data;
}

export const serverConfig = validateServerConfig();
