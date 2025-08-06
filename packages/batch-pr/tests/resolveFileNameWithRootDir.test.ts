import {
  normalizeRootDir,
  resolveFileNameWithRootDir,
} from '../utils/resolveFileNameWithRootDir';

import { describe, expect, test } from 'vitest';

describe('resolveFileNameWithRootDir', () => {
  describe('basic functionality', () => {
    test('should return original fileName when rootDir is not provided', () => {
      // Given
      const fileName = 'src/components/Button.tsx';

      // When
      const result = resolveFileNameWithRootDir(fileName);

      // Then
      expect(result).toBe('src/components/Button.tsx');
    });

    test('should return original fileName when rootDir is undefined', () => {
      // Given
      const fileName = 'src/components/Button.tsx';
      const rootDir = undefined;

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('src/components/Button.tsx');
    });

    test('should return empty string when fileName equals rootDir exactly', () => {
      // Given
      const fileName = 'src';
      const rootDir = 'src';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('');
    });

    test('should return relative path when fileName starts with rootDir', () => {
      // Given
      const fileName = 'src/components/Button.tsx';
      const rootDir = 'src';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('components/Button.tsx');
    });

    test('should return original fileName when fileName does not start with rootDir', () => {
      // Given
      const fileName = 'lib/utils/helper.ts';
      const rootDir = 'src';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('lib/utils/helper.ts');
    });
  });

  describe('rootDir with trailing slash handling', () => {
    test('should work correctly when rootDir has trailing slash', () => {
      // Given
      const fileName = 'src/components/Button.tsx';
      const rootDir = 'src/';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('components/Button.tsx');
    });

    test('should work correctly when rootDir does not have trailing slash', () => {
      // Given
      const fileName = 'src/components/Button.tsx';
      const rootDir = 'src';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('components/Button.tsx');
    });
  });

  describe('edge cases', () => {
    test('should handle empty fileName', () => {
      // Given
      const fileName = '';
      const rootDir = 'src';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('');
    });

    test('should handle empty rootDir', () => {
      // Given
      const fileName = 'src/components/Button.tsx';
      const rootDir = '';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('src/components/Button.tsx');
    });

    test('should handle single character fileName and rootDir', () => {
      // Given
      const fileName = 'a/b/c.ts';
      const rootDir = 'a';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('b/c.ts');
    });

    test('should handle deep nested paths', () => {
      // Given
      const fileName = 'very/deep/nested/folder/structure/file.ts';
      const rootDir = 'very/deep/nested';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('folder/structure/file.ts');
    });

    test('should handle paths with special characters', () => {
      // Given
      const fileName = 'src-main/components_new/Button-v2.tsx';
      const rootDir = 'src-main';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('components_new/Button-v2.tsx');
    });

    test('should handle similar but different rootDir paths', () => {
      // Given
      const fileName = 'src-test/components/Button.tsx';
      const rootDir = 'src';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('src-test/components/Button.tsx'); // Should not match
    });
  });

  describe('rootDir normalization integration', () => {
    test('should work with various rootDir formats', () => {
      // Given - Testing different rootDir formats that would be normalized
      const testCases = [
        {
          fileName: 'src/components/Button.tsx',
          rootDir: 'src',
          expected: 'components/Button.tsx',
        },
        {
          fileName: 'src/components/Button.tsx',
          rootDir: 'src/',
          expected: 'components/Button.tsx',
        },
        {
          fileName: 'packages/core/src/index.ts',
          rootDir: 'packages/core',
          expected: 'src/index.ts',
        },
        {
          fileName: 'packages/core/src/index.ts',
          rootDir: 'packages/core/',
          expected: 'src/index.ts',
        },
      ];

      testCases.forEach(({ fileName, rootDir, expected }) => {
        // When
        const result = resolveFileNameWithRootDir(fileName, rootDir);

        // Then
        expect(result).toBe(expected);
      });
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
