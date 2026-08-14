import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    maxConcurrency: 1,
    env: {
      NODE_ENV: 'test',
    },
  },
});
