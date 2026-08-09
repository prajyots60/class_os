import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL (e.g. http://localhost:3000)')
    .default('http://localhost:3000'),
});

export type ClientConfig = z.infer<typeof clientSchema>;

function validateClientConfig(): ClientConfig {
  const clientEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };

  const result = clientSchema.safeParse(clientEnv);

  if (!result.success) {
    const issueMessages = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('\n❌ CLIENT ENVIRONMENT CONFIGURATION VALIDATION FAILED:');
    console.error(issueMessages);

    throw new Error(`Client Environment Validation Failed:\n${issueMessages}`);
  }

  return result.data;
}

export const clientConfig = validateClientConfig();
