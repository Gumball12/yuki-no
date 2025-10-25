import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['./src/tests/**/*.test.ts'],
    exclude: ['./src/tests/integration/**', '**/*.d.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/*'],
      exclude: [
        // integration tests
        'src/index.ts',
        'src/app.ts',

        // tests, configs
        'src/tests/*',
        '*.config.ts',
      ],
    },
  },
});
