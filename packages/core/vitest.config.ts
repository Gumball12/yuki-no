import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['./tests/**', '!./tests/setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['./*'],
      exclude: [
        'tests/*',
        '*.config.ts',
        'dist/*',

        // orchestration
        'index.ts',
        'plugins/**/index.ts',
      ],
    },
  },
});
