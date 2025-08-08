import {
  createFileNameFilter,
  normalizeRootDir,
} from '../../utils/createFileNameFilter';

import type { Config } from '@yuki-no/plugin-sdk/types/config';
import { describe, expect, test } from 'vitest';

describe('createFileNameFilter', () => {
  describe('basic functionality', () => {
    test('should create a filter function', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      };

      // When
      const filter = createFileNameFilter(config);

      // Then
      expect(typeof filter).toBe('function');
    });

    test('should filter files based on include patterns', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('src/component.ts')).toBe(true);
      expect(filter('src/utils.ts')).toBe(true);
      expect(filter('src/component.js')).toBe(false);
      expect(filter('lib/helper.ts')).toBe(true);
    });

    test('should use default include pattern when include is empty', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: [],
        exclude: [],
      };
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('any/file.ts')).toBe(true);
      expect(filter('any/file.js')).toBe(true);
      expect(filter('any/file.json')).toBe(true);
    });
  });

  describe('filter function behavior', () => {
    test('should return false for empty fileName', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      const filter = createFileNameFilter(config);

      // When
      const result = filter('');

      // Then
      expect(result).toBe(false);
    });

    test('should return false when fileName does not start with normalizedRootDir', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      const filter = createFileNameFilter(config, 'src');

      // When
      const result = filter('lib/file.ts');

      // Then
      expect(result).toBe(false);
    });

    test('should return true when both include and exclude are empty', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: [],
        exclude: [],
      };
      const filter = createFileNameFilter(config, 'src');

      // When
      const result = filter('src/file.ts');

      // Then
      expect(result).toBe(true);
    });

    test('should return false when file is excluded', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      };
      const filter = createFileNameFilter(config, 'src');

      // When & Then
      expect(filter('src/file.test.ts')).toBe(false);
      expect(filter('src/component.test.ts')).toBe(false);
      expect(filter('src/nested/utils.test.ts')).toBe(false);
    });

    test('should return false when file is not included', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      const filter = createFileNameFilter(config, 'src');

      // When & Then
      expect(filter('src/file.js')).toBe(false);
      expect(filter('src/component.jsx')).toBe(false);
      expect(filter('src/config.json')).toBe(false);
    });

    test('should return true when file is included and not excluded', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      };
      const filter = createFileNameFilter(config, 'src');

      // When & Then
      expect(filter('src/file.ts')).toBe(true);
      expect(filter('src/component.ts')).toBe(true);
      expect(filter('src/nested/utils.ts')).toBe(true);
    });
  });

  describe('real-world pattern matching scenarios', () => {
    test('should handle complex include patterns', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts', '**/*.js', 'special/*.json'],
        exclude: [],
      };
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('src/component.ts')).toBe(true);
      expect(filter('lib/utils.js')).toBe(true);
      expect(filter('special/config.json')).toBe(true);
      expect(filter('regular/config.json')).toBe(false);
      expect(filter('src/styles.css')).toBe(false);
    });

    test('should handle complex exclude patterns', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**'],
        exclude: ['**/*.test.ts', '**/node_modules/**', '**/.git/**'],
      };
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('src/component.ts')).toBe(true);
      expect(filter('src/component.test.ts')).toBe(false);
      expect(filter('node_modules/package/index.js')).toBe(false);
      expect(filter('.git/config')).toBe(false);
      expect(filter('lib/utils.js')).toBe(true);
    });

    test('should correctly chain include and exclude logic', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['src/**/*.ts'],
        exclude: ['**/*.d.ts'],
      };
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('src/component.ts')).toBe(true); // Included, not excluded
      expect(filter('src/types.d.ts')).toBe(false); // Included but excluded
      expect(filter('lib/utils.ts')).toBe(false); // Not included (doesn't match src/**)
      expect(filter('src/component.js')).toBe(false); // Not included (not .ts)
    });

    test('should handle nested directories correctly', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['src/**/*.{ts,js}'],
        exclude: ['**/test/**', '**/*.spec.*'],
      };
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('src/components/Button.ts')).toBe(true);
      expect(filter('src/utils/helper.js')).toBe(true);
      expect(filter('src/test/setup.ts')).toBe(false); // Excluded by **/test/**
      expect(filter('src/components/Button.spec.ts')).toBe(false); // Excluded by **/*.spec.*
      expect(filter('lib/utils.ts')).toBe(false); // Not included (doesn't start with src/)
    });

    test('should work with specific file patterns', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['src/index.ts', 'lib/**/*.js'],
        exclude: ['**/*.min.js'],
      };
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('src/index.ts')).toBe(true);
      expect(filter('lib/utils.js')).toBe(true);
      expect(filter('lib/bundle.min.js')).toBe(false); // Excluded
      expect(filter('src/component.ts')).toBe(false); // Not specifically included
      expect(filter('other/index.ts')).toBe(false); // Not included
    });
  });

  describe('edge cases', () => {
    test('should handle rootDir with special characters', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      const specialRootDir = 'src-with-dashes/sub_dir';

      // When
      const filter = createFileNameFilter(config, specialRootDir);

      // Then
      expect(filter('src-with-dashes/sub_dir/file.ts')).toBe(true);
      expect(filter('other/file.ts')).toBe(false);
    });

    test('should work with different rootDir normalization results', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      const filter = createFileNameFilter(config, 'deeply/nested/path');

      // When & Then
      expect(filter('deeply/nested/path/file.ts')).toBe(true);
      expect(filter('deeply/nested/path/component.ts')).toBe(true);
      expect(filter('other/path/file.ts')).toBe(false);
    });

    test('should handle fileName that exactly matches rootDir', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**'],
        exclude: [],
      };
      const filter = createFileNameFilter(config, 'src');

      // When & Then
      expect(filter('src/')).toBe(true);
    });

    test('Real world tests', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['docs/**'],
        exclude: ['guide/migration*.md', '**/package.json'],
      };

      // When
      const filter = createFileNameFilter(config, 'docs');

      // Then - multiple calls should work consistently
      expect(filter('docs/a.md')).toBeTruthy();
      expect(filter('docs/ssr-using-modulerunner.md')).toBeTruthy();
      expect(
        filter('playground/ssr/src/forked-deadlock/README.md'),
      ).toBeFalsy();
      expect(filter('guide/migration.md')).toBeFalsy();
      expect(filter('/guide/migration.md')).toBeFalsy();
      expect(filter('guide/migration2.md')).toBeFalsy();
      expect(filter('package.json')).toBeFalsy();
      expect(filter('docs/package.json')).toBeFalsy();
      expect(filter('docs/.a/b.md')).toBeTruthy();
    });
  });

  describe('performance considerations', () => {
    test('should reuse filter functions for multiple file checks', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      };

      // When
      const filter = createFileNameFilter(config, 'src');

      // Then - multiple calls should work consistently
      expect(filter('src/file1.ts')).toBe(true);
      expect(filter('src/file2.ts')).toBe(true);
      expect(filter('src/file3.ts')).toBe(true);
      expect(filter('src/file1.test.ts')).toBe(false);
      expect(filter('src/file2.test.ts')).toBe(false);
    });
  });
});

describe('normalizeRootDir', () => {
  describe('basic functionality', () => {
    test('should add trailing slash to rootDir without one', () => {
      // Given
      const rootDir = 'src';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('src/');
    });

    test('should keep trailing slash when already present', () => {
      // Given
      const rootDir = 'src/';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('src/');
    });

    test('should return default empty string when no rootDir provided', () => {
      // Given & When
      const result = normalizeRootDir();

      // Then
      expect(result).toBe('');
    });

    test('should handle undefined rootDir', () => {
      // Given
      const rootDir = undefined;

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('');
    });
  });

  describe('edge cases', () => {
    test('should handle empty string', () => {
      // Given
      const rootDir = '';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('');
    });

    test('should handle root directory', () => {
      // Given
      const rootDir = '/';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('/');
    });

    test('should handle single character directory', () => {
      // Given
      const rootDir = 'a';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('a/');
    });

    test('should handle deeply nested paths', () => {
      // Given
      const rootDir = 'very/deep/nested/folder/structure';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('very/deep/nested/folder/structure/');
    });

    test('should handle paths with special characters', () => {
      // Given
      const rootDir = 'src-main/components_new';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('src-main/components_new/');
    });

    test('should handle paths with dots', () => {
      // Given
      const rootDir = 'src/v1.0/components';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('src/v1.0/components/');
    });

    test('should handle relative paths', () => {
      // Given
      const rootDir = './src/components';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('./src/components/');
    });

    test('should handle paths with multiple slashes', () => {
      // Given
      const rootDir = 'src//components';

      // When
      const result = normalizeRootDir(rootDir);

      // Then
      expect(result).toBe('src//components/');
    });
  });

  describe('performance and consistency', () => {
    test('should be consistent across multiple calls', () => {
      // Given
      const rootDir = 'src/components';

      // When
      const result1 = normalizeRootDir(rootDir);
      const result2 = normalizeRootDir(rootDir);
      const result3 = normalizeRootDir(rootDir);

      // Then
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('src/components/');
    });

    test('should handle various input formats consistently', () => {
      // Given
      const testCases = [
        { input: 'src', expected: 'src/' },
        { input: 'src/', expected: 'src/' },
        { input: '', expected: '' },
        { input: undefined, expected: '' },
        { input: 'a', expected: 'a/' },
        { input: 'a/', expected: 'a/' },
      ];

      testCases.forEach(({ input, expected }) => {
        // When
        const result = normalizeRootDir(input);

        // Then
        expect(result).toBe(expected);
      });
    });
  });
});
