import { createFileNameFilter } from '../utils/createFileNameFilter';

import type { Config } from '@yuki-no/plugin-sdk/types/config';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('picomatch');
vi.mock('../utils/resolveFileNameWithRootDir');

const picomatch = await import('picomatch');
const { normalizeRootDir } = await import(
  '../utils/resolveFileNameWithRootDir'
);

const mockPicomatch = vi.mocked(picomatch.default);
const mockNormalizeRootDir = vi.mocked(normalizeRootDir);

describe('createFileNameFilter', () => {
  const mockIsIncluded = vi.fn();
  const mockIsExcluded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockPicomatch
      .mockReturnValueOnce(mockIsIncluded) // First call for include patterns
      .mockReturnValueOnce(mockIsExcluded); // Second call for exclude patterns

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
      expect(mockPicomatch).toHaveBeenCalledTimes(2);
      expect(mockPicomatch).toHaveBeenNthCalledWith(1, ['**/*.ts']);
      expect(mockPicomatch).toHaveBeenNthCalledWith(2, ['**/*.test.ts']);
    });

    test('should use default include pattern when include is empty', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: [],
        exclude: ['**/*.test.ts'],
      };

      // When
      createFileNameFilter(config);

      // Then
      expect(mockPicomatch).toHaveBeenNthCalledWith(1, ['**']);
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
      mockIsIncluded.mockReturnValue(true);
      mockIsExcluded.mockReturnValue(true); // File is excluded
      const filter = createFileNameFilter(config, 'src');

      // When
      const result = filter('src/file.test.ts');

      // Then
      expect(result).toBe(false);
      expect(mockIsExcluded).toHaveBeenCalledWith('src/file.test.ts');
    });

    test('should return false when file is not included', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: [],
      };
      mockNormalizeRootDir.mockReturnValue('src/');
      mockIsIncluded.mockReturnValue(false); // File is not included
      mockIsExcluded.mockReturnValue(false);
      const filter = createFileNameFilter(config, 'src');

      // When
      const result = filter('src/file.js');

      // Then
      expect(result).toBe(false);
      expect(mockIsIncluded).toHaveBeenCalledWith('src/file.js');
    });

    test('should return true when file is included and not excluded', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      };
      mockNormalizeRootDir.mockReturnValue('src/');
      mockIsIncluded.mockReturnValue(true);
      mockIsExcluded.mockReturnValue(false);
      const filter = createFileNameFilter(config, 'src');

      // When
      const result = filter('src/file.ts');

      // Then
      expect(result).toBe(true);
      expect(mockIsExcluded).toHaveBeenCalledWith('src/file.ts');
      expect(mockIsIncluded).toHaveBeenCalledWith('src/file.ts');
    });
  });

  describe('edge cases', () => {
    test('should handle complex include patterns', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts', '**/*.js', 'special/*.json'],
        exclude: [],
      };

      // When
      createFileNameFilter(config);

      // Then
      expect(mockPicomatch).toHaveBeenNthCalledWith(1, [
        '**/*.ts',
        '**/*.js',
        'special/*.json',
      ]);
    });

    test('should handle complex exclude patterns', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**'],
        exclude: ['**/*.test.ts', '**/node_modules/**', '**/.git/**'],
      };

      // When
      createFileNameFilter(config);

      // Then
      expect(mockPicomatch).toHaveBeenNthCalledWith(2, [
        '**/*.test.ts',
        '**/node_modules/**',
        '**/.git/**',
      ]);
    });

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
      mockIsIncluded.mockReturnValue(true);
      mockIsExcluded.mockReturnValue(false);
      const filter = createFileNameFilter(config, 'deeply/nested/path');

      // When
      const result = filter('deeply/nested/path/file.ts');

      // Then
      expect(result).toBe(true);
    });

    test('should handle fileName that exactly matches rootDir', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**'],
        exclude: [],
      };
      mockNormalizeRootDir.mockReturnValue('src/');
      mockIsIncluded.mockReturnValue(true);
      mockIsExcluded.mockReturnValue(false);
      const filter = createFileNameFilter(config, 'src');

      // When
      const result = filter('src/');

      // Then
      expect(result).toBe(true);
    });
  });

  describe('performance considerations', () => {
    test('should create picomatch functions only once per config', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      };

      // When
      const filter = createFileNameFilter(config);
      filter('src/file1.ts');
      filter('src/file2.ts');
      filter('src/file3.ts');

      // Then
      expect(mockPicomatch).toHaveBeenCalledTimes(2); // Only called during filter creation
    });
  });

  describe('integration with pattern matching', () => {
    test('should correctly chain include and exclude logic', () => {
      // Given
      const config: Pick<Config, 'include' | 'exclude'> = {
        include: ['src/**/*.ts'],
        exclude: ['**/*.d.ts'],
      };
      mockNormalizeRootDir.mockReturnValue('');

      // Setup complex mock behavior
      mockIsIncluded.mockImplementation((fileName: string) => {
        return fileName.includes('src/') && fileName.endsWith('.ts');
      });
      mockIsExcluded.mockImplementation((fileName: string) => {
        return fileName.endsWith('.d.ts');
      });

      const filter = createFileNameFilter(config);

      // When & Then
      expect(filter('src/component.ts')).toBe(true); // Included, not excluded
      expect(filter('src/types.d.ts')).toBe(false); // Included but excluded
      expect(filter('lib/utils.ts')).toBe(false); // Not included
      expect(filter('src/component.js')).toBe(false); // Not included
    });
  });
});
