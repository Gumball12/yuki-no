import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['./src/tests/integration/**/*.test.ts'],
    setupFiles: ['./src/tests/setup.ts', './src/tests/integration/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/*'],
      exclude: ['src/tests/*', 'src/index.ts', '*.config.ts', 'src/e2e/*'],
    },
  },
});
