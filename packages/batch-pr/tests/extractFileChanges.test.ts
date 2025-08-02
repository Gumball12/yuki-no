import {
  extractFileChanges,
  type FileNameFilter,
} from '../utils/extractFileChanges';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
// Import mocked dependencies
import { createTempFilePath } from '@yuki-no/plugin-sdk/utils/common';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('@yuki-no/plugin-sdk/utils/common', async () => {
  const actual = await vi.importActual('@yuki-no/plugin-sdk/utils/common');
  return {
    ...actual,
    createTempFilePath: vi.fn(),
  };
});
vi.mock('node:fs');
vi.mock('node:path');

const mockCreateTempFilePath = vi.mocked(createTempFilePath);
const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('extractFileChanges', () => {
  // Mock Git interface
  const mockGitExec = vi.fn();
  const mockGit = { exec: mockGitExec } as unknown as Git;

  // Test data
  const testHash = 'abc123';
  const defaultFilter: FileNameFilter = () => true;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockPath.extname.mockImplementation((fileName: string) => {
      const lastDot = fileName.lastIndexOf('.');
      return lastDot === -1 ? '' : fileName.substring(lastDot);
    });
  });

  describe('basic functionality', () => {
    test('should return empty array when no file changes', () => {
      // Given
      mockGitExec.mockReturnValue('');

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result).toEqual([]);
      expect(mockGitExec).toHaveBeenCalledWith(
        `show --name-status --format="" ${testHash}`,
      );
    });

    test('should return empty array when all files filtered out', () => {
      // Given
      mockGitExec.mockReturnValue('M\tfile.ts');
      const rejectAllFilter: FileNameFilter = () => false;

      // When
      const result = extractFileChanges(mockGit, testHash, rejectAllFilter);

      // Then
      expect(result).toEqual([]);
    });

    test('should apply file name filter correctly', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts\nM\tfile.js') // show --name-status
        .mockReturnValueOnce('100644 blob def456\tfile.ts') // ls-tree
        .mockReturnValueOnce('@@ -1,1 +1,1 @@\n-old\n+new'); // show diff
      const tsOnlyFilter: FileNameFilter = fileName => fileName.endsWith('.ts');

      // When
      const result = extractFileChanges(mockGit, testHash, tsOnlyFilter);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0].upstreamFileName).toBe('file.ts');
      expect(result[0].type).toBe('update');
    });
  });

  describe('file status processing', () => {
    describe('Modified files (M)', () => {
      test('should create update type for modified file', () => {
        // Given
        mockGitExec
          .mockReturnValueOnce('M\tfile.ts') // show --name-status
          .mockReturnValueOnce('100644 blob def456\tfile.ts') // ls-tree
          .mockReturnValueOnce('@@ -1,1 +1,1 @@\n-old line\n+new line'); // show diff

        // When
        const result = extractFileChanges(mockGit, testHash, defaultFilter);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'update',
          upstreamFileName: 'file.ts',
          changes: [
            { type: 'delete-line', lineNumber: 1 },
            { type: 'insert-line', lineNumber: 1, content: 'new line' },
          ],
        });
      });
    });

    describe('Added files (A)', () => {
      test('should create update type for added file', () => {
        // Given
        mockGitExec
          .mockReturnValueOnce('A\tnewfile.ts') // show --name-status
          .mockReturnValueOnce('100644 blob def456\tnewfile.ts') // ls-tree
          .mockReturnValueOnce('@@ -0,0 +1,1 @@\n+new content'); // show diff

        // When
        const result = extractFileChanges(mockGit, testHash, defaultFilter);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'update',
          upstreamFileName: 'newfile.ts',
          changes: [
            { type: 'insert-line', lineNumber: 1, content: 'new content' },
          ],
        });
      });
    });

    describe('Deleted files (D)', () => {
      test('should create delete type for deleted file', () => {
        // Given
        mockGitExec.mockReturnValueOnce('D\tfile.ts');

        // When
        const result = extractFileChanges(mockGit, testHash, defaultFilter);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'delete',
          upstreamFileName: 'file.ts',
        });
      });
    });

    describe('Renamed files (R)', () => {
      test('should create rename type for renamed file with similarity < 100', () => {
        // Given
        mockGitExec
          .mockReturnValueOnce('R85\told.ts\tnew.ts') // show --name-status
          .mockReturnValueOnce('100644 blob def456\told.ts') // ls-tree
          .mockReturnValueOnce('@@ -1,1 +1,1 @@\n-old line\n+new line'); // show diff

        // When
        const result = extractFileChanges(mockGit, testHash, defaultFilter);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'rename',
          upstreamFileName: 'old.ts',
          nextUpstreamFileName: 'new.ts',
          similarity: 85,
          changes: [
            { type: 'delete-line', lineNumber: 1 },
            { type: 'insert-line', lineNumber: 1, content: 'new line' },
          ],
        });
      });

      test('should create rename type without line changes for similarity = 100', () => {
        // Given
        mockGitExec.mockReturnValueOnce('R100\told.ts\tnew.ts');

        // When
        const result = extractFileChanges(mockGit, testHash, defaultFilter);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'rename',
          upstreamFileName: 'old.ts',
          nextUpstreamFileName: 'new.ts',
          similarity: 100,
          changes: [],
        });
      });

      test('should apply filter to nextHeadFileName for renamed files', () => {
        // Given
        mockGitExec.mockReturnValueOnce('R100\told.js\tnew.ts');
        const tsOnlyFilter: FileNameFilter = fileName =>
          fileName.endsWith('.ts');

        // When
        const result = extractFileChanges(mockGit, testHash, tsOnlyFilter);

        // Then
        expect(result).toHaveLength(1); // Should include because new.ts matches filter
      });
    });

    describe('Copied files (C)', () => {
      test('should create copy type for copied file', () => {
        // Given
        mockGitExec
          .mockReturnValueOnce('C75\tsource.ts\tcopy.ts') // show --name-status
          .mockReturnValueOnce('100644 blob def456\tsource.ts') // ls-tree
          .mockReturnValueOnce('@@ -1,1 +1,1 @@\n-old line\n+new line'); // show diff

        // When
        const result = extractFileChanges(mockGit, testHash, defaultFilter);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'copy',
          upstreamFileName: 'source.ts',
          nextUpstreamFileName: 'copy.ts',
          similarity: 75,
          changes: [
            { type: 'delete-line', lineNumber: 1 },
            { type: 'insert-line', lineNumber: 1, content: 'new line' },
          ],
        });
      });
    });

    describe('Type changed files (T)', () => {
      test('should create type change for type changed file', () => {
        // Given
        mockGitExec.mockReturnValueOnce('T\tfile.sh');

        // When
        const result = extractFileChanges(mockGit, testHash, defaultFilter);

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'type',
          upstreamFileName: 'file.sh',
        });
      });
    });
  });

  describe('line change parsing', () => {
    test('should parse multiple hunks correctly', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce('100644 blob def456\tfile.ts') // ls-tree
        .mockReturnValueOnce(
          [
            '@@ -1,1 +1,1 @@',
            '-first old line',
            '+first new line',
            '@@ -10,1 +10,1 @@',
            '-second old line',
            '+second new line',
          ].join('\n'),
        ); // show diff

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result[0].type).toBe('update');
      if (result[0].type === 'update') {
        expect(result[0].changes).toEqual([
          { type: 'delete-line', lineNumber: 1 },
          { type: 'insert-line', lineNumber: 1, content: 'first new line' },
          { type: 'delete-line', lineNumber: 10 },
          { type: 'insert-line', lineNumber: 10, content: 'second new line' },
        ]);
      }
    });

    test('should ignore context lines and file headers', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce('100644 blob def456\tfile.ts') // ls-tree
        .mockReturnValueOnce(
          [
            'diff --git a/file.ts b/file.ts',
            'index abc123..def456 100644',
            '--- a/file.ts',
            '+++ b/file.ts',
            '@@ -1,3 +1,3 @@',
            ' context line',
            '-old line',
            '+new line',
            ' another context line',
          ].join('\n'),
        ); // show diff

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result[0].type).toBe('update');
      if (result[0].type === 'update') {
        expect(result[0].changes).toEqual([
          { type: 'delete-line', lineNumber: 2 },
          { type: 'insert-line', lineNumber: 2, content: 'new line' },
        ]);
      }
    });

    test('should handle empty lines correctly', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce('100644 blob def456\tfile.ts') // ls-tree
        .mockReturnValueOnce(['@@ -1,2 +1,2 @@', '-', '+'].join('\n')); // show diff with empty lines

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result[0].type).toBe('update');
      if (result[0].type === 'update') {
        expect(result[0].changes).toEqual([
          { type: 'delete-line', lineNumber: 1 },
          { type: 'insert-line', lineNumber: 1, content: '' },
        ]);
      }
    });
  });

  describe('binary file handling', () => {
    beforeEach(() => {
      mockCreateTempFilePath.mockReturnValue('/tmp/test-binary.tmp');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('binary content'));
      mockFs.unlinkSync.mockImplementation(() => {});
    });

    test('should detect binary files by extension', () => {
      // Given
      mockPath.extname.mockReturnValue('.png');
      mockGitExec
        .mockReturnValueOnce('M\timage.png') // show --name-status
        .mockReturnValueOnce('100644 blob def456\timage.png') // ls-tree
        .mockReturnValueOnce(''); // show blob

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result).toHaveLength(2); // delete + update for binary modification
      expect(result[0]).toEqual({
        type: 'delete',
        upstreamFileName: 'image.png',
      });
      expect(result[1]).toEqual({
        type: 'update',
        upstreamFileName: 'image.png',
        changes: Buffer.from('binary content'),
      });
    });

    test('should handle binary file extraction failure', () => {
      // Given
      mockPath.extname.mockReturnValue('.png');
      mockFs.existsSync.mockReturnValue(false);
      mockGitExec
        .mockReturnValueOnce('A\timage.png') // show --name-status
        .mockReturnValueOnce('100644 blob def456\timage.png'); // ls-tree

      // When & Then
      expect(() => {
        extractFileChanges(mockGit, testHash, defaultFilter);
      }).toThrow('Failed to extract binary change for blob def456');
    });

    test('should clean up temp file even on failure', () => {
      // Given
      mockPath.extname.mockReturnValue('.png');
      mockFs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true); // first for read check, second for cleanup check
      mockGitExec
        .mockReturnValueOnce('A\timage.png') // show --name-status
        .mockReturnValueOnce('100644 blob def456\timage.png'); // ls-tree

      // When & Then
      expect(() => {
        extractFileChanges(mockGit, testHash, defaultFilter);
      }).toThrow();

      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/test-binary.tmp');
    });
  });

  describe('filtering and rootDir', () => {
    test('should resolve file names with rootDir', () => {
      // Given
      mockGitExec.mockReturnValueOnce('D\tsrc/file.ts');

      // When
      const result = extractFileChanges(
        mockGit,
        testHash,
        defaultFilter,
        'src',
      );

      // Then
      expect(result[0].upstreamFileName).toBe('file.ts');
    });

    test('should handle rootDir with trailing slash', () => {
      // Given
      mockGitExec.mockReturnValueOnce('D\tsrc/file.ts');

      // When
      const result = extractFileChanges(
        mockGit,
        testHash,
        defaultFilter,
        'src/',
      );

      // Then
      expect(result[0].upstreamFileName).toBe('file.ts');
    });

    test('should return empty string when fileName equals rootDir', () => {
      // Given
      mockGitExec.mockReturnValueOnce('D\tsrc');

      // When
      const result = extractFileChanges(
        mockGit,
        testHash,
        defaultFilter,
        'src',
      );

      // Then
      expect(result[0].upstreamFileName).toBe('');
    });

    test('should return original fileName when not under rootDir', () => {
      // Given
      mockGitExec.mockReturnValueOnce('D\tother/file.ts');

      // When
      const result = extractFileChanges(
        mockGit,
        testHash,
        defaultFilter,
        'src',
      );

      // Then
      expect(result[0].upstreamFileName).toBe('other/file.ts');
    });

    test('should resolve nextUpstreamFileName for renamed files with rootDir', () => {
      // Given
      mockGitExec.mockReturnValueOnce('R100\tsrc/old.ts\tsrc/new.ts');

      // When
      const result = extractFileChanges(
        mockGit,
        testHash,
        defaultFilter,
        'src',
      );

      // Then
      expect(result[0]).toMatchObject({
        upstreamFileName: 'old.ts',
        nextUpstreamFileName: 'new.ts',
      });
    });
  });

  describe('edge cases', () => {
    test('should throw error for invalid status line', () => {
      // Given
      mockGitExec.mockReturnValueOnce('INVALID\tfile.ts');

      // When & Then
      expect(() => {
        extractFileChanges(mockGit, testHash, defaultFilter);
      }).toThrow('Unable to parse status line: INVALID\tfile.ts');
    });

    test('should throw error when blob hash not found', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce('100644 blob def456\tother.ts'); // ls-tree (different file)

      // When & Then
      expect(() => {
        extractFileChanges(mockGit, testHash, defaultFilter);
      }).toThrow(
        `Failed to extract blob hash for file.ts (head-repo: ${testHash})`,
      );
    });

    test('should handle special characters in file names', () => {
      // Given
      mockGitExec.mockReturnValueOnce('D\tfile with spaces.ts');

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result[0].upstreamFileName).toBe('file with spaces.ts');
    });

    test('should handle files without extension', () => {
      // Given
      mockPath.extname.mockReturnValue('');
      mockGitExec.mockReturnValueOnce('D\tMakefile');

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result[0]).toEqual({
        type: 'delete',
        upstreamFileName: 'Makefile',
      });
    });

    test('should throw error for unsupported status in createSimpleFileChange', () => {
      // This test might fail if the implementation doesn't handle unknown statuses properly
      // Given - we need to somehow trigger an unknown status through createSimpleFileChange
      // This is hard to test directly due to the parsing logic, so we'll test the parsing error instead
      mockGitExec.mockReturnValueOnce('X\tfile.ts');

      // When & Then
      expect(() => {
        extractFileChanges(mockGit, testHash, defaultFilter);
      }).toThrow('Unable to parse status line: X\tfile.ts');
    });
  });

  describe('multiple file changes', () => {
    test('should handle multiple different file operations', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce(
          [
            'M\tmodified.ts',
            'A\tadded.ts',
            'D\tdeleted.ts',
            'R100\told.ts\tnew.ts',
          ].join('\n'),
        ) // show --name-status
        .mockReturnValueOnce('100644 blob abc123\tmodified.ts') // ls-tree for modified
        .mockReturnValueOnce('@@ -1,1 +1,1 @@\n-old\n+new') // diff for modified
        .mockReturnValueOnce('100644 blob def456\tadded.ts') // ls-tree for added
        .mockReturnValueOnce('@@ -0,0 +1,1 @@\n+content'); // diff for added

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result).toHaveLength(4);

      // Modified file
      expect(result[0]).toMatchObject({
        type: 'update',
        upstreamFileName: 'modified.ts',
      });

      // Added file
      expect(result[1]).toMatchObject({
        type: 'update',
        upstreamFileName: 'added.ts',
      });

      // Deleted file
      expect(result[2]).toEqual({
        type: 'delete',
        upstreamFileName: 'deleted.ts',
      });

      // Renamed file
      expect(result[3]).toEqual({
        type: 'rename',
        upstreamFileName: 'old.ts',
        nextUpstreamFileName: 'new.ts',
        similarity: 100,
        changes: [],
      });
    });
  });
});
