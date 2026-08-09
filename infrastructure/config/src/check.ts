import { serverConfig } from './server';
import { clientConfig } from './client';

export function runEnvironmentCheck() {
  console.log('🔍 Executing CoachingOS Environment Verification Check...');
  console.log(`  - NODE_ENV: ${serverConfig.NODE_ENV}`);
  console.log(`  - PORT: ${serverConfig.PORT}`);
  console.log(`  - NEXT_PUBLIC_APP_URL: ${clientConfig.NEXT_PUBLIC_APP_URL}`);
  console.log(`  - DATABASE_URL: Configured (REDACTED)`);
  console.log('✅ Environment configuration is 100% valid!\n');
}

runEnvironmentCheck();
