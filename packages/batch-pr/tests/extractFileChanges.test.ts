import { extractFileChanges } from '../utils/extractFileChanges';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
// Import mocked dependencies
import { createTempFilePath } from '@yuki-no/plugin-sdk/utils/common';
import type { FileNameFilter } from '@yuki-no/plugin-sdk/utils/createFileNameFilter';
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
        .mockReturnValueOnce(
          // show -U0 --format=
          'diff --git a/file.ts b/file.ts\nindex abc123..def456 100644\n--- a/file.ts\n+++ b/file.ts\n@@ -1,1 +1,1 @@\n-old\n+new',
        );
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
    test('should handle Modified files (M)', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce(
          // show -U0 --format=
          'diff --git a/file.ts b/file.ts\nindex abc123..def456 100644\n--- a/file.ts\n+++ b/file.ts\n@@ -1,1 +1,1 @@\n-old line\n+new line',
        )
        .mockReturnValueOnce('old line');

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
        totalLineCount: 1,
      });
    });

    test('should handle Added files (A)', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('A\tnewfile.ts') // show --name-status
        .mockReturnValueOnce(
          // show -U0 --format=
          'diff --git a/newfile.ts b/newfile.ts\nnew file mode 100644\nindex 0000000..def456\n--- /dev/null\n+++ b/newfile.ts\n@@ -0,0 +1,1 @@\n+new content',
        );

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
        totalLineCount: 0,
      });
    });

    test('should handle Deleted files (D)', () => {
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

    test('should handle Renamed files (R) with changes', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('R85\told.ts\tnew.ts') // show --name-status
        .mockReturnValueOnce(
          // show -U0 --format=
          'diff --git a/old.ts b/new.ts\nsimilarity index 85%\nrename from old.ts\nrename to new.ts\nindex abc123..def456 100644\n--- a/old.ts\n+++ b/new.ts\n@@ -1,1 +1,1 @@\n-old line\n+new line',
        )
        .mockReturnValueOnce('old line');

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
        totalLineCount: 1,
      });
    });

    test('should handle Renamed files (R) without changes', () => {
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

    test('should handle Copied files (C)', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('C75\tsource.ts\tcopy.ts') // show --name-status
        .mockReturnValueOnce(
          // show -U0 --format=
          'diff --git a/source.ts b/copy.ts\nsimilarity index 75%\ncopy from source.ts\ncopy to copy.ts\nindex abc123..def456 100644\n--- a/source.ts\n+++ b/copy.ts\n@@ -1,1 +1,1 @@\n-old line\n+new line',
        )
        .mockReturnValueOnce('old line');

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
        totalLineCount: 1,
      });
    });

    test('should handle Type changed files (T)', () => {
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

  describe('line change parsing', () => {
    test('should parse multiple hunks correctly', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce(
          // show -U0 --format=
          [
            'diff --git a/file.ts b/file.ts',
            'index abc123..def456 100644',
            '--- a/file.ts',
            '+++ b/file.ts',
            '@@ -1,1 +1,1 @@',
            '-first old line',
            '+first new line',
            '@@ -10,1 +10,1 @@',
            '-second old line',
            '+second new line',
          ].join('\n'),
        )
        .mockReturnValueOnce(
          '1\n2\n3\n4\n5\n6\n7\n8\n9\n10',
        );

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result[0].type).toBe('update');
      if (result[0].type === 'update' && 'totalLineCount' in result[0]) {
        expect(result[0].changes).toEqual([
          { type: 'delete-line', lineNumber: 1 },
          { type: 'insert-line', lineNumber: 1, content: 'first new line' },
          { type: 'delete-line', lineNumber: 10 },
          { type: 'insert-line', lineNumber: 10, content: 'second new line' },
        ]);
        expect(result[0].totalLineCount).toBe(10);
      }
    });

    test('should handle empty lines correctly', () => {
      // Given
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce(
          // show -U0 --format=
          'diff --git a/file.ts b/file.ts\nindex abc123..def456 100644\n--- a/file.ts\n+++ b/file.ts\n@@ -1,2 +1,2 @@\n-\n+',
        )
        .mockReturnValueOnce('\n');

      // When
      const result = extractFileChanges(mockGit, testHash, defaultFilter);

      // Then
      expect(result[0].type).toBe('update');
      if (result[0].type === 'update' && 'totalLineCount' in result[0]) {
        expect(result[0].changes).toEqual([
          { type: 'delete-line', lineNumber: 1 },
          { type: 'insert-line', lineNumber: 1, content: '' },
        ]);
        expect(result[0].totalLineCount).toBe(2);
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
        .mockReturnValueOnce('100644 blob def456\timage.png') // ls-tree for binary
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

    test('should throw error when file not found in diff output', () => {
      // Given - file status indicates a modification but diff doesn't contain the file
      mockGitExec
        .mockReturnValueOnce('M\tfile.ts') // show --name-status
        .mockReturnValueOnce('diff --git a/other.ts b/other.ts\n...'); // show -U0 --format= (different file)

      // When & Then
      expect(() => {
        extractFileChanges(mockGit, testHash, defaultFilter);
      }).toThrow(`Failed to extract fileName from ${testHash} for file.ts`);
    });

    test('should throw error for blob hash not found in binary files', () => {
      // Given
      mockPath.extname.mockReturnValue('.png');
      mockGitExec
        .mockReturnValueOnce('M\timage.png') // show --name-status
        .mockReturnValueOnce('100644 blob def456\tother.png'); // ls-tree (different file)

      // When & Then
      expect(() => {
        extractFileChanges(mockGit, testHash, defaultFilter);
      }).toThrow(
        'Failed to extract blob hash for image.png (head-repo: abc123)',
      );
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
        .mockReturnValue(
          // show -U0 --format=
          [
            'diff --git a/modified.ts b/modified.ts',
            'index abc123..def456 100644',
            '--- a/modified.ts',
            '+++ b/modified.ts',
            '@@ -1,1 +1,1 @@',
            '-old',
            '+new',
            'diff --git a/added.ts b/added.ts',
            'new file mode 100644',
            'index 0000000..def456',
            '--- /dev/null',
            '+++ b/added.ts',
            '@@ -0,0 +1,1 @@',
            '+content',
          ].join('\n'),
        );

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
