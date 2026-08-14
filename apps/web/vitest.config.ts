import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    // Integration tests share a single PostgreSQL test database via cleanTestDatabase().
    // Running in parallel causes PostgreSQL deadlocks and data wiping when concurrent transactions
    // contend on the same tables (user, institute, session). Enforce sequential file execution.
    fileParallelism: false,
    maxWorkers: 1,
    env: {
      NODE_ENV: 'test',
    },
  },
});
