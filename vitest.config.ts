import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['./packages/*/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/*.ts'],
      exclude: [
        'packages/*/tests/**/*.ts',
        'packages/*/dist/**/*.ts',
        'vitest.config.ts',

        // types
        'packages/core/types/**/*.ts',
        'packages/batch-pr/types.ts',

        // orchestration
        'packages/batch-pr/index.ts',
        // 'packages/release-tracking/index.ts',
      ],
    },
  },
});
