import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTestEnvironment } from './test-db-guard';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupTestDatabase() {
  console.log('🌱 Setting up CoachingOS PostgreSQL Test Database...');
  const { testDatabaseUrl } = validateTestEnvironment();

  const rootBin = path.resolve(__dirname, '../../../../node_modules/.pnpm/node_modules/.bin');
  const pathEnv = `${rootBin}:${process.env.PATH}`;

  try {
    const configPath = path.resolve(__dirname, '../../prisma.config.ts');
    execSync(`prisma migrate deploy --config ${configPath}`, {
      env: {
        ...process.env,
        PATH: pathEnv,
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
