import { createFileNameFilter } from '../utils/createFileNameFilter';

import type { Config } from '@yuki-no/plugin-sdk/types/config';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock only the dependencies we want to isolate
vi.mock('../utils/resolveFileNameWithRootDir');

const { normalizeRootDir } = await import(
  '../utils/resolveFileNameWithRootDir'
);

const mockNormalizeRootDir = vi.mocked(normalizeRootDir);

describe('createFileNameFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNormalizeRootDir.mockReturnValue('src/');
  });

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
      mockNormalizeRootDir.mockReturnValue('');
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
      mockNormalizeRootDir.mockReturnValue('');
      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('any/file.ts')).toBe(true);
      expect(filter('any/file.js')).toBe(true);
      expect(filter('any/file.json')).toBe(true);
    });

    test('should call normalizeRootDir with provided rootDir', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      const rootDir = 'src';

      // When
      createFileNameFilter(config, rootDir);

      // Then
      expect(mockNormalizeRootDir).toHaveBeenCalledWith('src');
    });

    test('should call normalizeRootDir with empty string when rootDir not provided', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };

      // When
      createFileNameFilter(config);

      // Then
      expect(mockNormalizeRootDir).toHaveBeenCalledWith('');
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
      mockNormalizeRootDir.mockReturnValue('src/');
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
      mockNormalizeRootDir.mockReturnValue('src/');
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
      mockNormalizeRootDir.mockReturnValue('src/');
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
      mockNormalizeRootDir.mockReturnValue('src/');
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
      mockNormalizeRootDir.mockReturnValue('src/');
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
      mockNormalizeRootDir.mockReturnValue('');
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
      mockNormalizeRootDir.mockReturnValue('');
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
      mockNormalizeRootDir.mockReturnValue('');
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
      mockNormalizeRootDir.mockReturnValue('');
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
      mockNormalizeRootDir.mockReturnValue('');
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
      createFileNameFilter(config, specialRootDir);

      // Then
      expect(mockNormalizeRootDir).toHaveBeenCalledWith(
        'src-with-dashes/sub_dir',
      );
    });

    test('should work with different rootDir normalization results', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      mockNormalizeRootDir.mockReturnValue('deeply/nested/path/');
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
      mockNormalizeRootDir.mockReturnValue('src/');
      const filter = createFileNameFilter(config, 'src');

      // When & Then
      expect(filter('src/')).toBe(true);
    });
  });

  describe('performance considerations', () => {
    test('should reuse filter functions for multiple file checks', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      };
      mockNormalizeRootDir.mockReturnValue('src/');

      // When
      const filter = createFileNameFilter(config);

      // Then - multiple calls should work consistently
      expect(filter('src/file1.ts')).toBe(true);
      expect(filter('src/file2.ts')).toBe(true);
      expect(filter('src/file3.ts')).toBe(true);
      expect(filter('src/file1.test.ts')).toBe(false);
      expect(filter('src/file2.test.ts')).toBe(false);
    });

    test('>>> test', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['docs/**'],
        exclude: ['guide/migration*.md', 'package.json'],
      };
      mockNormalizeRootDir.mockReturnValue('docs');

      // When
      const filter = createFileNameFilter(config);

      // Then - multiple calls should work consistently
      expect(filter('docs/a.md')).toBeTruthy();
      expect(filter('docs/ssr-using-modulerunner.md')).toBeTruthy();
      expect(
        filter('playground/ssr/src/forked-deadlock/README.md'),
      ).toBeFalsy();
    });
  });
});
