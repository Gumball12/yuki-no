import {
  extractFileLineChanges,
  type FileLineChanges,
  resolveFileNameWithRootDir,
} from '../../utils/extractFileLineChanges';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('@yuki-no/plugin-sdk/infra/git');

const mockGitExec = vi.fn();
const mockGit = {
  exec: mockGitExec,
} as unknown as Git;

describe('extractFileLineChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGitExec.mockClear();
  });

  describe('when no files are changed', () => {
    test('should return empty array', () => {
      // Given
      mockGitExec.mockReturnValue('');
      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      expect(result).toEqual([]);
      expect(mockGitExec).toHaveBeenCalledWith(
        'show --name-only --format="" abc123',
      );
    });
  });

  describe('when files are filtered out', () => {
    test('should return empty array when no files pass filter', () => {
      // Given
      mockGitExec.mockReturnValue('file1.txt\nfile2.md\n');
      const hash = 'abc123';
      const fileNameFilter = (fileName: string) => fileName.endsWith('.ts');

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      expect(result).toEqual([]);
    });
  });

  describe('when extracting simple insertion', () => {
    test('should correctly parse added lines', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\n') // show --name-only
        .mockReturnValueOnce(`--- a/src/test.ts
+++ b/src/test.ts
@@ -1,0 +1,2 @@
+const hello = 'world';
+console.log(hello);`); // show diff

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/test.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: "const hello = 'world';",
            },
            {
              type: 'insert',
              lineNumber: 2,
              content: 'console.log(hello);',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when extracting simple deletion', () => {
    test('should correctly parse deleted lines', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\n')
        .mockReturnValueOnce(`--- a/src/test.ts
+++ b/src/test.ts
@@ -1,2 +1,0 @@
-const hello = 'world';
-console.log(hello);`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/test.ts',
          changes: [
            {
              type: 'delete',
              lineNumber: 1,
            },
            {
              type: 'delete',
              lineNumber: 2,
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when extracting mixed changes', () => {
    test('should correctly parse both insertions and deletions', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\n')
        .mockReturnValueOnce(`--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,3 @@
 const hello = 'world';
-console.log(hello);
+console.log(hello + '!');
 // end of file`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/test.ts',
          changes: [
            {
              lineNumber: 1,
              type: 'delete',
            },
            {
              content: "console.log(hello + '!');",
              lineNumber: 1,
              type: 'insert',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when processing multiple hunks', () => {
    test('should correctly track line numbers across hunks', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\n')
        .mockReturnValueOnce(`--- a/src/test.ts
+++ b/src/test.ts
@@ -1,1 +1,2 @@
 const hello = 'world';
+console.log('first addition');
@@ -10,1 +11,2 @@
 const goodbye = 'world';
+console.log('second addition');`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/test.ts',
          changes: [
            {
              content: "console.log('first addition');",
              lineNumber: 1,
              type: 'insert',
            },
            {
              content: "console.log('second addition');",
              lineNumber: 11,
              type: 'insert',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when processing multiple files', () => {
    test('should extract changes from all files', () => {
      // Given
      mockGitExec.mockReturnValueOnce('file1.ts\nfile2.ts\n')
        .mockReturnValueOnce(`--- a/file1.ts
+++ b/file1.ts
@@ -1,0 +1,1 @@
+file1 content`).mockReturnValueOnce(`--- a/file2.ts
+++ b/file2.ts
@@ -1,0 +1,1 @@
+file2 content`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'file1.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: 'file1 content',
            },
          ],
        },
        {
          fileName: 'file2.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: 'file2 content',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when file has no actual changes', () => {
    test('should not include file in result', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\n').mockReturnValueOnce(''); // Empty diff output

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      expect(result).toEqual([]);
    });
  });

  describe('when processing diff with file headers and special messages', () => {
    test('should ignore non-content lines', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\n')
        .mockReturnValueOnce(`diff --git a/src/test.ts b/src/test.ts
index 1234567..abcdefg 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,2 +1,2 @@
 const hello = 'world';
-console.log(hello);
+console.log(hello + '!');
\\ No newline at end of file`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/test.ts',
          changes: [
            {
              lineNumber: 1,
              type: 'delete',
            },
            {
              content: "console.log(hello + '!');",
              lineNumber: 1,
              type: 'insert',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when processing new file creation', () => {
    test('should handle new file mode header', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/new-file.ts\n')
        .mockReturnValueOnce(`diff --git a/src/new-file.ts b/src/new-file.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/new-file.ts
@@ -0,0 +1,2 @@
+const newFile = true;
+export default newFile;`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/new-file.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: 'const newFile = true;',
            },
            {
              type: 'insert',
              lineNumber: 2,
              content: 'export default newFile;',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when processing file deletion', () => {
    test('should handle deleted file mode header', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/deleted-file.ts\n')
        .mockReturnValueOnce(`diff --git a/src/deleted-file.ts b/src/deleted-file.ts
deleted file mode 100644
index 1234567..0000000
--- a/src/deleted-file.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-const deletedFile = true;
-export default deletedFile;`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/deleted-file.ts',
          changes: [
            {
              type: 'delete',
              lineNumber: 1,
            },
            {
              type: 'delete',
              lineNumber: 2,
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when applying filename filter', () => {
    test('should only process files that pass the filter', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\nsrc/test.js\nREADME.md\n');
      const hash = 'abc123';
      const fileNameFilter = (fileName: string) => fileName.endsWith('.ts');

      // When
      extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      expect(mockGitExec).toHaveBeenCalledTimes(2);
      expect(mockGitExec).toHaveBeenCalledWith(
        'show --name-only --format="" abc123',
      );
      expect(mockGitExec).toHaveBeenCalledWith(
        'show -U0 --format= abc123 -- "src/test.ts"',
      );
    });
  });

  describe('when hunk header has single line context', () => {
    test('should parse hunk header without old_count and new_count', () => {
      // Given
      mockGitExec.mockReturnValueOnce('src/test.ts\n')
        .mockReturnValueOnce(`--- a/src/test.ts
+++ b/src/test.ts
@@ -5 +5 @@
-old line
+new line`);

      const hash = 'abc123';
      const fileNameFilter = () => true;

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'src/test.ts',
          changes: [
            {
              type: 'delete',
              lineNumber: 5,
            },
            {
              type: 'insert',
              lineNumber: 5,
              content: 'new line',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('when rootDir is provided', () => {
    test('should resolve fileName with rootDir', () => {
      // Given
      mockGitExec.mockReturnValueOnce('docs/a/b/c.md\n')
        .mockReturnValueOnce(`--- a/docs/a/b/c.md
+++ b/docs/a/b/c.md
@@ -1,0 +1,1 @@
+test content`);

      const hash = 'abc123';
      const fileNameFilter = () => true;
      const rootDir = 'docs';

      // When
      const result = extractFileLineChanges({
        headGit: mockGit,
        hash,
        fileNameFilter,
        rootDir,
      });

      // Then
      const expected: FileLineChanges[] = [
        {
          fileName: 'a/b/c.md',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: 'test content',
            },
          ],
        },
      ];
      expect(result).toEqual(expected);
    });
  });
});

describe('resolveFileNameWithRootDir', () => {
  describe('when rootDir is undefined', () => {
    test('should return original fileName', () => {
      // Given
      const fileName = 'docs/a/b/c.md';
      const rootDir = undefined;

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('docs/a/b/c.md');
    });
  });

  describe('when rootDir is provided and fileName starts with rootDir', () => {
    test('should remove rootDir from fileName', () => {
      // Given
      const fileName = 'docs/a/b/c.md';
      const rootDir = 'docs';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('a/b/c.md');
    });

    test('should handle nested rootDir', () => {
      // Given
      const fileName = 'docs/a/b/c.md';
      const rootDir = 'docs/a';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('b/c.md');
    });

    test('should handle rootDir with trailing slash', () => {
      // Given
      const fileName = 'docs/a/b/c.md';
      const rootDir = 'docs/';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('a/b/c.md');
    });
  });

  describe('when fileName equals rootDir exactly', () => {
    test('should return empty string', () => {
      // Given
      const fileName = 'docs';
      const rootDir = 'docs';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('');
    });
  });

  describe('when fileName does not start with rootDir', () => {
    test('should return original fileName', () => {
      // Given
      const fileName = 'other/file.md';
      const rootDir = 'docs';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('other/file.md');
    });

    test('should return fileName when rootDir is longer', () => {
      // Given
      const fileName = 'docs';
      const rootDir = 'docs/a';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('docs');
    });

    test('should return fileName when fileName is similar but not prefixed by normalizedRootDir', () => {
      // Given
      const fileName = 'docs-other';
      const rootDir = 'docs';

      // When
      const result = resolveFileNameWithRootDir(fileName, rootDir);

      // Then
      expect(result).toBe('docs-other');
    });
  });
});
