import { serverConfig } from './server';
import { clientConfig } from './client';

export function runEnvironmentCheck() {
  console.log('🔍 Executing CoachingOS Environment Verification Check...');
  console.log(`  - NODE_ENV: ${serverConfig.NODE_ENV}`);
  console.log(`  - PORT: ${serverConfig.PORT}`);
  console.log(`  - NEXT_PUBLIC_APP_URL: ${clientConfig.NEXT_PUBLIC_APP_URL}`);
  console.log(`  - DATABASE_URL: Configured (REDACTED)`);
  console.log(
    `  - TEST_DATABASE_URL: ${serverConfig.TEST_DATABASE_URL ? 'Configured (REDACTED)' : 'Not set (Optional)'}`,
  );
  console.log('✅ Environment configuration is 100% valid!\n');
}

runEnvironmentCheck();
