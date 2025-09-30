import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['./src/tests/**', '!./src/tests/setup.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/*'],
      exclude: ['src/tests/*', 'src/index.ts', '*.config.ts', 'src/e2e/*'],
    },
  },
});
