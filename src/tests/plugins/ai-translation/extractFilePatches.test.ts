import type { Git } from '../../../git/core';
import { extractFileLineChanges } from '../../../plugins/ai-translation/extractFilePatches';

import { describe, expect, it, vi } from 'vitest';

describe('extractFilePatches', () => {
  const createMockGit = (execReturnValues: Record<string, string>): Git => {
    const mockGit = {
      exec: vi.fn((command: string) => {
        for (const [cmdPattern, returnValue] of Object.entries(
          execReturnValues,
        )) {
          if (command.includes(cmdPattern)) {
            return returnValue;
          }
        }
        throw new Error(`Unexpected command: ${command}`);
      }),
    } as unknown as Git;

    return mockGit;
  };

  const testHash = 'abc123';
  const testFilename = 'test-file.js';
  const acceptAllFilter = () => true;

  describe('extractFileLineChanges', () => {
    it('should return empty array when no files changed', () => {
      const git = createMockGit({
        'show --name-only': '',
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result).toEqual([]);
    });

    it('should filter files based on fileNameFilter', () => {
      const git = createMockGit({
        'show --name-only': 'file1.js\nfile2.txt\nfile3.js',
        'show -U0': '',
      });

      const jsFileFilter = (filename: string) => filename.endsWith('.js');
      const result = extractFileLineChanges(git, testHash, jsFileFilter);

      expect(git.exec).toHaveBeenCalledWith(
        expect.stringContaining('show --name-only'),
      );
      // Since diff output is empty, no changes are detected
      expect(result).toEqual([]);
    });

    it('should extract changes from multiple files', () => {
      const git = createMockGit({
        'show --name-only': 'file1.js\nfile2.js',
        'show -U0 --format= abc123 -- "file1.js"': `@@ -1,1 +1,1 @@\n-old line\n+new line`,
        'show -U0 --format= abc123 -- "file2.js"': `@@ -1,0 +1,1 @@\n+added line`,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('file1.js');
      expect(result[1].filename).toBe('file2.js');
    });
  });

  describe('extractLineChangesFromFile - Normal Cases', () => {
    it('should handle simple line modification', () => {
      const diffOutput = `@@ -5,1 +5,1 @@\n-old content\n+new content`;

      const git = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result).toHaveLength(1);
      expect(result[0].changes).toEqual([
        { type: 'delete', lineNumber: 5 },
        { type: 'insert', lineNumber: 5, content: 'new content' },
      ]);
    });

    it('should handle line insertion', () => {
      const diffOutput = `@@ -3,0 +3,2 @@\n+first new line\n+second new line`;

      const git = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result[0].changes).toEqual([
        { type: 'insert', lineNumber: 3, content: 'first new line' },
        { type: 'insert', lineNumber: 4, content: 'second new line' },
      ]);
    });

    it('should handle line deletion', () => {
      const diffOutput = `@@ -2,3 +2,0 @@\n-line to delete 1\n-line to delete 2\n-line to delete 3`;

      const git = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result[0].changes).toEqual([
        { type: 'delete', lineNumber: 2 },
        { type: 'delete', lineNumber: 3 },
        { type: 'delete', lineNumber: 4 },
      ]);
    });
  });

  describe('extractLineChangesFromFile - File Creation/Deletion', () => {
    it('should handle new file creation', () => {
      const diffOutput = `new file mode 100644\n--- /dev/null\n+++ b/new-file.js\n@@ -0,0 +1,3 @@\n+Line 1 content\n+Line 2 content\n+Line 3 content`;

      const git = createMockGit({
        'show --name-only': 'new-file.js',
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result[0].changes).toEqual([
        { type: 'insert', lineNumber: 1, content: 'Line 1 content' },
        { type: 'insert', lineNumber: 2, content: 'Line 2 content' },
        { type: 'insert', lineNumber: 3, content: 'Line 3 content' },
      ]);
    });

    it('should handle file deletion', () => {
      const diffOutput = `deleted file mode 100644\n--- a/deleted-file.js\n+++ /dev/null\n@@ -1,3 +0,0 @@\n-Line 1 to delete\n-Line 2 to delete\n-Line 3 to delete`;

      const git = createMockGit({
        'show --name-only': 'deleted-file.js',
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result[0].changes).toEqual([
        { type: 'delete', lineNumber: 1 },
        { type: 'delete', lineNumber: 2 },
        { type: 'delete', lineNumber: 3 },
      ]);
    });
  });

  describe('extractLineChangesFromFile - Complex Cases', () => {
    it('should handle the case: delete last 5 lines and add 3 lines', () => {
      const diffOutput = `@@ -6,5 +6,3 @@\n-Line 6 content\n-Line 7 content\n-Line 8 content\n-Line 9 content\n-Line 10 content\n+New line 1\n+New line 2\n+New line 3`;

      const git = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result[0].changes).toEqual([
        { type: 'delete', lineNumber: 6 },
        { type: 'delete', lineNumber: 7 },
        { type: 'delete', lineNumber: 8 },
        { type: 'delete', lineNumber: 9 },
        { type: 'delete', lineNumber: 10 },
        { type: 'insert', lineNumber: 6, content: 'New line 1' },
        { type: 'insert', lineNumber: 7, content: 'New line 2' },
        { type: 'insert', lineNumber: 8, content: 'New line 3' },
      ]);
    });

    it('should handle multiple hunks in a single file', () => {
      const diffOutput = `@@ -1,1 +1,1 @@\n-first old line\n+first new line\n@@ -5,0 +5,2 @@\n+inserted line 1\n+inserted line 2\n@@ -10,2 +12,0 @@\n-deleted line 1\n-deleted line 2`;

      const git = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result[0].changes).toEqual([
        // First hunk
        { type: 'delete', lineNumber: 1 },
        { type: 'insert', lineNumber: 1, content: 'first new line' },
        // Second hunk
        { type: 'insert', lineNumber: 5, content: 'inserted line 1' },
        { type: 'insert', lineNumber: 6, content: 'inserted line 2' },
        // Third hunk
        { type: 'delete', lineNumber: 10 },
        { type: 'delete', lineNumber: 11 },
      ]);
    });

    it('should skip file headers and special messages', () => {
      const diffOutput = `diff --git a/test.js b/test.js\nindex 1234567..abcdefg 100644\n--- a/test.js\n+++ b/test.js\n@@ -1,1 +1,1 @@\n-old line\n+new line\n\\\\ No newline at end of file`;

      const git = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput,
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result[0].changes).toEqual([
        { type: 'delete', lineNumber: 1 },
        { type: 'insert', lineNumber: 1, content: 'new line' },
      ]);
    });

    it('should handle empty diff output', () => {
      const git = createMockGit({
        'show --name-only': testFilename,
        'show -U0': '',
      });

      const result = extractFileLineChanges(git, testHash, acceptAllFilter);

      expect(result).toEqual([]);
    });

    it('should handle hunk headers with different formats', () => {
      const diffOutput1 = `@@ -1 +1 @@\n-old line\n+new line`;

      const diffOutput2 = `@@ -1,2 +1,3 @@\n-line 1\n-line 2\n+new line 1\n+new line 2\n+new line 3`;

      const git1 = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput1,
      });

      const git2 = createMockGit({
        'show --name-only': testFilename,
        'show -U0': diffOutput2,
      });

      const result1 = extractFileLineChanges(git1, testHash, acceptAllFilter);
      const result2 = extractFileLineChanges(git2, testHash, acceptAllFilter);

      expect(result1[0].changes).toEqual([
        { type: 'delete', lineNumber: 1 },
        { type: 'insert', lineNumber: 1, content: 'new line' },
      ]);

      expect(result2[0].changes).toEqual([
        { type: 'delete', lineNumber: 1 },
        { type: 'delete', lineNumber: 2 },
        { type: 'insert', lineNumber: 1, content: 'new line 1' },
        { type: 'insert', lineNumber: 2, content: 'new line 2' },
        { type: 'insert', lineNumber: 3, content: 'new line 3' },
      ]);
    });
  });
});
