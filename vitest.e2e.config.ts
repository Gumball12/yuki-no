import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['./src/e2e/**/*.e2e.test.ts'],
    setupFiles: ['dotenv/config'],
    testTimeout: 3 * 60 * 1_000, // 3 mins
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1,
      },
    },
    sequence: {
      concurrent: false,
    },
    coverage: {
      enabled: false,
    },
  },
});
