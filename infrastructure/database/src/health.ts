import { db } from './index';

export async function checkDatabaseHealth(): Promise<boolean> {
  console.log('🔍 Executing CoachingOS Database Health Verification...');

  try {
    // 1. Verify Prisma Client Initialization & Connection
    const startTime = Date.now();
    const result = await db.$queryRaw<{ connected: number }[]>`SELECT 1 as connected;`;
    const latency = Date.now() - startTime;

    if (result && result.length > 0 && result[0]?.connected === 1) {
      console.log(`✅ Database Health Verification SUCCESSFUL!`);
      console.log(`   - Driver Adapter: @prisma/adapter-pg (pg.Pool)`);
      console.log(`   - Health Check Query: SELECT 1`);
      console.log(`   - Round-trip Latency: ${latency}ms`);
      return true;
    } else {
      console.error('❌ Database Health Check returned unexpected query result:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Database Health Check FAILED to connect to PostgreSQL:');
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    } else {
      console.error(error);
    }
    return false;
  } finally {
    await db.$disconnect();
  }
}

// Execute CLI health check if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDatabaseHealth()
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}
