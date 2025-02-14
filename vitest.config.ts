import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        // External dependencies and entry points
        'src/git.ts',
        'src/github.ts',
        'src/index.ts',
        // Config files
        '*.config.ts',
        // Test files
        'tests/*',
        // Landing page
        'webpage/*',
      ],
    },
  },
});
