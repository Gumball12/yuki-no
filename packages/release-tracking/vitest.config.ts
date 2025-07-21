import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['./tests/**/*.test.ts', '!./tests/setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['./*.ts'],
      exclude: ['tests/*', '*.config.ts', 'dist/*', '*.d.ts', 'index.ts'],
    },
  },
});
