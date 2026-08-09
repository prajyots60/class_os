import { execSync } from 'node:child_process';
import { validateTestEnvironment } from './test-db-guard';

export function setupTestDatabase() {
  console.log('🌱 Setting up CoachingOS PostgreSQL Test Database...');
  const { testDatabaseUrl } = validateTestEnvironment();

  try {
    // Run prisma db push against TEST_DATABASE_URL
    execSync('npx prisma migrate deploy --config ./prisma.config.ts', {
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
      stdio: 'inherit',
    });
    console.log('✅ Test database schema push completed successfully!\n');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('setup-test-db.ts')) {
  setupTestDatabase();
}
