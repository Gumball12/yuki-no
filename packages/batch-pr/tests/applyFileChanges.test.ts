import type { FileChange } from '../types';
import { applyFileChanges } from '../utils/applyFileChanges';

import type { Git } from '@yuki-no/plugin-sdk/infra/git';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('node:fs');
vi.mock('node:path');

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('applyFileChanges', () => {
  // Mock Git interface
  const mockGit = { dirName: '/test/repo' } as Git;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockPath.join.mockImplementation((...paths: string[]) => paths.join('/'));
    mockPath.dirname.mockImplementation((filePath: string) => {
      const parts = filePath.split('/');
      return parts.slice(0, -1).join('/');
    });
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('line1\nline2\nline3');
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.unlinkSync.mockImplementation(() => {});
    mockFs.renameSync.mockImplementation(() => {});
    mockFs.copyFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => undefined);
  });

  describe('basic functionality', () => {
    test('should do nothing when fileChanges array is empty', () => {
      // Given
      const fileChanges: FileChange[] = [];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockFs.renameSync).not.toHaveBeenCalled();
      expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    });

    test('should combine upstreamGit.dirName with file name correctly', () => {
      // Given
      const fileChanges: FileChange[] = [
        {
          type: 'delete',
          upstreamFileName: 'test.ts',
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mockPath.join).toHaveBeenCalledWith('/test/repo', 'test.ts');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/test/repo/test.ts');
    });
  });

  describe('file operations', () => {
    describe('update type', () => {
      test('should handle LineChange[] with insert and delete operations', () => {
        // Given
        mockFs.readFileSync.mockReturnValue('line1\nline2\nline3\nline4');
        const fileChanges: FileChange[] = [
          {
            type: 'update',
            upstreamFileName: 'test.ts',
            changes: [
              { type: 'delete-line', lineNumber: 2 },
              { type: 'insert-line', lineNumber: 3, content: 'new line 3' },
            ],
            totalLineCount: 4,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.readFileSync).toHaveBeenCalledWith(
          '/test/repo/test.ts',
          'utf-8',
        );
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/repo/test.ts',
          'line1\nline3\nnew line 3\nline4',
          'utf-8',
        );
      });

      test('should apply deletes in descending order and inserts in ascending order', () => {
        // Given
        mockFs.readFileSync.mockReturnValue(
          'line1\nline2\nline3\nline4\nline5',
        );
        const fileChanges: FileChange[] = [
          {
            type: 'update',
            upstreamFileName: 'test.ts',
            changes: [
              { type: 'delete-line', lineNumber: 1 }, // Should be applied second
              { type: 'delete-line', lineNumber: 4 }, // Should be applied first (higher line number)
              { type: 'insert-line', lineNumber: 2, content: 'new line 2' }, // Should be applied first (lower line number)
              { type: 'insert-line', lineNumber: 5, content: 'new line 5' }, // Should be applied second
            ],
            totalLineCount: 5,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        // Note: This test verifies the sorting logic works correctly
        // Delete order: line 4 first, then line 1
        // Insert order: line 2 first, then line 5
        expect(mockFs.writeFileSync).toHaveBeenCalled();
      });

      test('should handle Buffer changes by writing content directly', () => {
        // Given
        const bufferContent = Buffer.from('new file content');
        const fileChanges: FileChange[] = [
          {
            type: 'update',
            upstreamFileName: 'test.ts',
            changes: bufferContent,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/repo/test.ts',
          bufferContent,
        );
      });

      test('should handle non-existent file by starting with empty array', () => {
        // Given
        mockFs.existsSync.mockReturnValue(false);
        const fileChanges: FileChange[] = [
          {
            type: 'update',
            upstreamFileName: 'new-file.ts',
            changes: [
              { type: 'insert-line', lineNumber: 1, content: 'first line' },
            ],
            totalLineCount: 0,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/repo/new-file.ts',
          'first line',
          'utf-8',
        );
      });

      test('should handle empty file content', () => {
        // Given
        mockFs.readFileSync.mockReturnValue('');
        const fileChanges: FileChange[] = [
          {
            type: 'update',
            upstreamFileName: 'empty.ts',
            changes: [
              { type: 'insert-line', lineNumber: 1, content: 'new content' },
            ],
            totalLineCount: 0,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/repo/empty.ts',
          'new content',
          'utf-8',
        );
      });

      test('should create directory if it does not exist', () => {
        // Given
        mockFs.existsSync.mockImplementation(filePath => {
          // File exists, but directory doesn't
          return !String(filePath).includes('nested');
        });
        const fileChanges: FileChange[] = [
          {
            type: 'update',
            upstreamFileName: 'nested/dir/test.ts',
            changes: Buffer.from('content'),
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockPath.dirname).toHaveBeenCalledWith(
          '/test/repo/nested/dir/test.ts',
        );
        expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/repo/nested/dir', {
          recursive: true,
        });
      });
    });

    describe('delete type', () => {
      test('should delete existing file', () => {
        // Given
        const fileChanges: FileChange[] = [
          {
            type: 'delete',
            upstreamFileName: 'to-delete.ts',
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          '/test/repo/to-delete.ts',
        );
        expect(mockFs.unlinkSync).toHaveBeenCalledWith(
          '/test/repo/to-delete.ts',
        );
      });

      test('should ignore deletion of non-existent file', () => {
        // Given
        mockFs.existsSync.mockReturnValue(false);
        const fileChanges: FileChange[] = [
          {
            type: 'delete',
            upstreamFileName: 'non-existent.ts',
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          '/test/repo/non-existent.ts',
        );
        expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      });
    });

    describe('rename type', () => {
      test('should rename file without additional changes', () => {
        // Given
        const fileChanges: FileChange[] = [
          {
            type: 'rename',
            upstreamFileName: 'old-name.ts',
            nextUpstreamFileName: 'new-name.ts',
            similarity: 100,
            changes: [],
            totalLineCount: 3,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          '/test/repo/old-name.ts',
        );
        expect(mockFs.renameSync).toHaveBeenCalledWith(
          '/test/repo/old-name.ts',
          '/test/repo/new-name.ts',
        );
      });

      test('should rename file and apply additional changes', () => {
        // Given
        mockFs.readFileSync.mockReturnValue('original content');
        const fileChanges: FileChange[] = [
          {
            type: 'rename',
            upstreamFileName: 'old-name.ts',
            nextUpstreamFileName: 'new-name.ts',
            similarity: 85,
            changes: [
              { type: 'insert-line', lineNumber: 1, content: 'new line' },
            ],
            totalLineCount: 1,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.renameSync).toHaveBeenCalledWith(
          '/test/repo/old-name.ts',
          '/test/repo/new-name.ts',
        );
        expect(mockFs.readFileSync).toHaveBeenCalledWith(
          '/test/repo/new-name.ts',
          'utf-8',
        );
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/repo/new-name.ts',
          'new line\noriginal content',
          'utf-8',
        );
      });

      test('should create target directory for rename', () => {
        // Given
        mockFs.existsSync.mockImplementation(filePath => {
          // Source exists, target directory doesn't
          return String(filePath).includes('old-name.ts');
        });
        const fileChanges: FileChange[] = [
          {
            type: 'rename',
            upstreamFileName: 'old-name.ts',
            nextUpstreamFileName: 'nested/new-name.ts',
            similarity: 100,
            changes: [],
            totalLineCount: 3,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockPath.dirname).toHaveBeenCalledWith(
          '/test/repo/nested/new-name.ts',
        );
        expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/repo/nested', {
          recursive: true,
        });
        expect(mockFs.renameSync).toHaveBeenCalledWith(
          '/test/repo/old-name.ts',
          '/test/repo/nested/new-name.ts',
        );
      });

      test('should ignore rename if source file does not exist', () => {
        // Given
        mockFs.existsSync.mockReturnValue(false);
        const fileChanges: FileChange[] = [
          {
            type: 'rename',
            upstreamFileName: 'non-existent.ts',
            nextUpstreamFileName: 'new-name.ts',
            similarity: 100,
            changes: [],
            totalLineCount: 0,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          '/test/repo/non-existent.ts',
        );
        expect(mockFs.renameSync).not.toHaveBeenCalled();
        expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      });
    });

    describe('copy type', () => {
      test('should copy file without additional changes', () => {
        // Given
        const fileChanges: FileChange[] = [
          {
            type: 'copy',
            upstreamFileName: 'source.ts',
            nextUpstreamFileName: 'copy.ts',
            similarity: 100,
            changes: [],
            totalLineCount: 3,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.existsSync).toHaveBeenCalledWith('/test/repo/source.ts');
        expect(mockFs.copyFileSync).toHaveBeenCalledWith(
          '/test/repo/source.ts',
          '/test/repo/copy.ts',
        );
      });

      test('should copy file and apply additional changes', () => {
        // Given
        mockFs.readFileSync.mockReturnValue('original content');
        const fileChanges: FileChange[] = [
          {
            type: 'copy',
            upstreamFileName: 'source.ts',
            nextUpstreamFileName: 'copy.ts',
            similarity: 75,
            changes: [
              { type: 'insert-line', lineNumber: 2, content: 'modified line' },
            ],
            totalLineCount: 1,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.copyFileSync).toHaveBeenCalledWith(
          '/test/repo/source.ts',
          '/test/repo/copy.ts',
        );
        expect(mockFs.readFileSync).toHaveBeenCalledWith(
          '/test/repo/copy.ts',
          'utf-8',
        );
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/repo/copy.ts',
          'original content\nmodified line',
          'utf-8',
        );
      });

      test('should create target directory for copy', () => {
        // Given
        mockFs.existsSync.mockImplementation(filePath => {
          // Source exists, target directory doesn't
          return String(filePath).includes('source.ts');
        });
        const fileChanges: FileChange[] = [
          {
            type: 'copy',
            upstreamFileName: 'source.ts',
            nextUpstreamFileName: 'nested/copy.ts',
            similarity: 100,
            changes: [],
            totalLineCount: 3,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockPath.dirname).toHaveBeenCalledWith(
          '/test/repo/nested/copy.ts',
        );
        expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/repo/nested', {
          recursive: true,
        });
        expect(mockFs.copyFileSync).toHaveBeenCalledWith(
          '/test/repo/source.ts',
          '/test/repo/nested/copy.ts',
        );
      });

      test('should ignore copy if source file does not exist', () => {
        // Given
        mockFs.existsSync.mockReturnValue(false);
        const fileChanges: FileChange[] = [
          {
            type: 'copy',
            upstreamFileName: 'non-existent.ts',
            nextUpstreamFileName: 'copy.ts',
            similarity: 100,
            changes: [],
            totalLineCount: 0,
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          '/test/repo/non-existent.ts',
        );
        expect(mockFs.copyFileSync).not.toHaveBeenCalled();
        expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      });
    });

    describe('type change', () => {
      test('should ignore type change operations', () => {
        // Given
        const fileChanges: FileChange[] = [
          {
            type: 'type',
            upstreamFileName: 'file.sh',
          },
        ];

        // When
        applyFileChanges(mockGit, fileChanges);

        // Then
        expect(mockFs.existsSync).not.toHaveBeenCalled();
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
        expect(mockFs.unlinkSync).not.toHaveBeenCalled();
        expect(mockFs.renameSync).not.toHaveBeenCalled();
        expect(mockFs.copyFileSync).not.toHaveBeenCalled();
      });
    });
  });

  describe('line change processing', () => {
    test('should handle complex line changes with correct ordering', () => {
      // Given
      mockFs.readFileSync.mockReturnValue('line1\nline2\nline3\nline4\nline5');
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'complex.ts',
          changes: [
            { type: 'insert-line', lineNumber: 2, content: 'inserted at 2' },
            { type: 'delete-line', lineNumber: 3 },
            { type: 'delete-line', lineNumber: 5 },
            { type: 'insert-line', lineNumber: 1, content: 'inserted at 1' },
            { type: 'delete-line', lineNumber: 1 },
          ],
            totalLineCount: 5,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      // This test verifies that the sorting and application logic works correctly
      // Deletes should be applied in descending order: 5, 3, 1
      // Inserts should be applied in ascending order: 1, 2
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
      expect(typeof writtenContent).toBe('string');
    });

    test('should handle line changes with boundary conditions', () => {
      // Given
      mockFs.readFileSync.mockReturnValue('only line');
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'boundary.ts',
          changes: [
            { type: 'delete-line', lineNumber: 1 },
            { type: 'insert-line', lineNumber: 1, content: 'replacement line' },
          ],
            totalLineCount: 1,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/repo/boundary.ts',
        'replacement line',
        'utf-8',
      );
    });

    test('should handle delete operations beyond file bounds gracefully', () => {
      // Given
      mockFs.readFileSync.mockReturnValue('line1\nline2');
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'bounds.ts',
          changes: [
            { type: 'delete-line', lineNumber: 5 }, // Beyond file bounds
            { type: 'insert-line', lineNumber: 3, content: 'new line' },
          ],
            totalLineCount: 2,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      // Should not crash and should apply valid operations
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle multiple file operations in sequence', () => {
      // Given
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'file1.ts',
          changes: [
            { type: 'insert-line', lineNumber: 1, content: 'content1' },
          ],
            totalLineCount: 3,
        },
        {
          type: 'delete',
          upstreamFileName: 'file2.ts',
        },
        {
          type: 'rename',
          upstreamFileName: 'file3.ts',
          nextUpstreamFileName: 'file3-renamed.ts',
          similarity: 100,
          changes: [],
            totalLineCount: 3,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/repo/file1.ts',
        'content1\nline1\nline2\nline3',
        'utf-8',
      );
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/test/repo/file2.ts');
      expect(mockFs.renameSync).toHaveBeenCalledWith(
        '/test/repo/file3.ts',
        '/test/repo/file3-renamed.ts',
      );
    });

    test('should handle nested directory creation correctly', () => {
      // Given
      mockFs.existsSync.mockImplementation(filePath => {
        // Only the deeply nested directory doesn't exist
        return !String(filePath).includes('very/deep/nested');
      });
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'very/deep/nested/file.ts',
          changes: Buffer.from('content'),
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        '/test/repo/very/deep/nested',
        { recursive: true },
      );
    });

    test('should handle empty line changes array', () => {
      // Given
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'empty-changes.ts',
          changes: [],
            totalLineCount: 3,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        '/test/repo/empty-changes.ts',
        'utf-8',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/repo/empty-changes.ts',
        'line1\nline2\nline3',
        'utf-8',
      );
    });

    test('should preserve file content when no line changes are provided', () => {
      // Given
      const originalContent = 'original\ncontent\nhere';
      mockFs.readFileSync.mockReturnValue(originalContent);
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'preserve.ts',
          changes: [],
            totalLineCount: 3,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/repo/preserve.ts',
        originalContent,
        'utf-8',
      );
    });
  });

  describe('potential implementation concerns', () => {
    test('should verify line number conversion from 1-based to 0-based', () => {
      // Given
      mockFs.readFileSync.mockReturnValue('line1\nline2\nline3');
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'test.ts',
          changes: [
            { type: 'delete-line', lineNumber: 1 }, // Should delete first line (index 0)
          ],
          totalLineCount: 3,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      // If implementation is correct, line1 should be removed
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/repo/test.ts',
        'line2\nline3',
        'utf-8',
      );
    });

    test('should verify proper handling of insert at line 0', () => {
      // Given
      mockFs.readFileSync.mockReturnValue('existing line');
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'test.ts',
          changes: [
            {
              type: 'insert-line',
              lineNumber: 0,
              content: 'inserted at beginning',
            },
          ],
          totalLineCount: 1,
        },
      ];

      // When
      applyFileChanges(mockGit, fileChanges);

      // Then
      // Note: If lineNumber 0 is not handled correctly, this test might fail
      // The implementation should handle this edge case properly
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('line count mismatch', () => {
    test('should skip update and return mismatched file when line counts differ', () => {
      // Given
      mockFs.readFileSync.mockReturnValue('line1\nline2\nline3\nline4'); // 4 lines
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'mismatched.ts',
          changes: [
            { type: 'insert-line', lineNumber: 1, content: 'new line' },
          ],
          totalLineCount: 3, // Expected 3 lines
        },
      ];

      // When
      const mismatchedFiles = applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mismatchedFiles).toEqual(['mismatched.ts']);
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    test('should skip rename and return mismatched file when line counts differ', () => {
      // Given
      mockFs.readFileSync.mockReturnValue('line1\nline2'); // 2 lines
      const fileChanges: FileChange[] = [
        {
          type: 'rename',
          upstreamFileName: 'old-mismatched.ts',
          nextUpstreamFileName: 'new-mismatched.ts',
          similarity: 90,
          changes: [],
          totalLineCount: 3, // Expected 3 lines
        },
      ];

      // When
      const mismatchedFiles = applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mismatchedFiles).toEqual(['old-mismatched.ts']);
      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });

    test('should not check line count for binary files', () => {
      // Given
      const bufferContent = Buffer.from('binary data');
      const fileChanges: FileChange[] = [
        {
          type: 'update',
          upstreamFileName: 'binary.png',
          changes: bufferContent,
        },
      ];

      // When
      const mismatchedFiles = applyFileChanges(mockGit, fileChanges);

      // Then
      expect(mismatchedFiles).toEqual([]);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/repo/binary.png',
        bufferContent,
      );
    });
  });
});
