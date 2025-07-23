import type { Git } from '../../../git/core';
import { applyFileLineChanges } from '../../../plugins/ai-translation/applyFilePatches';
import type {
  FileLineChanges,
  LineChange,
} from '../../../plugins/ai-translation/extractFilePatches';

import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fs module
vi.mock('node:fs');

describe('applyFilePatches', () => {
  const mockFs = vi.mocked(fs);
  const mockGit = {
    dirName: '/mock/repo/path',
    exec: vi.fn((command: string) => {
      if (command.includes('rev-parse --show-toplevel')) {
        return '/mock/repo/path';
      }
      return '/mock/repo/path';
    }),
  } as unknown as Git;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createFileLineChanges = (
    filename: string,
    changes: LineChange[],
  ): FileLineChanges => ({
    filename,
    changes,
  });

  describe('applyFileLineChanges', () => {
    it('should handle empty file changes', async () => {
      await applyFileLineChanges({
        fileLineChanges: [],
        targetGit: mockGit,
      });

      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should apply simple line modification', async () => {
      const initialContent = 'line1\nline2\nold content\nline4\nline5';
      mockFs.readFileSync.mockReturnValue(initialContent);

      const changes: LineChange[] = [
        { type: 'delete', lineNumber: 3 },
        { type: 'insert', lineNumber: 3, content: 'new content' },
      ];

      await applyFileLineChanges({
        fileLineChanges: [createFileLineChanges('test.txt', changes)],
        targetGit: mockGit,
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/test.txt',
        'line1\nline2\nnew content\nline4\nline5',
        'utf-8',
      );
    });

    it('should handle line insertion', async () => {
      const initialContent = 'line1\nline2\nline3';
      mockFs.readFileSync.mockReturnValue(initialContent);

      const changes: LineChange[] = [
        { type: 'insert', lineNumber: 3, content: 'inserted line 1' },
        { type: 'insert', lineNumber: 4, content: 'inserted line 2' },
      ];

      await applyFileLineChanges({
        fileLineChanges: [createFileLineChanges('test.txt', changes)],
        targetGit: mockGit,
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/test.txt',
        'line1\nline2\ninserted line 1\ninserted line 2\nline3',
        'utf-8',
      );
    });

    it('should handle line deletion', async () => {
      const initialContent = 'line1\nto delete 1\nto delete 2\nline4';
      mockFs.readFileSync.mockReturnValue(initialContent);

      const changes: LineChange[] = [
        { type: 'delete', lineNumber: 2 },
        { type: 'delete', lineNumber: 3 },
      ];

      await applyFileLineChanges({
        fileLineChanges: [createFileLineChanges('test.txt', changes)],
        targetGit: mockGit,
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/test.txt',
        'line1\nline4',
        'utf-8',
      );
    });

    it('should handle new file creation', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const changes: LineChange[] = [
        { type: 'insert', lineNumber: 1, content: 'Line 1 content' },
        { type: 'insert', lineNumber: 2, content: 'Line 2 content' },
        { type: 'insert', lineNumber: 3, content: 'Line 3 content' },
      ];

      await applyFileLineChanges({
        fileLineChanges: [createFileLineChanges('new-file.txt', changes)],
        targetGit: mockGit,
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/new-file.txt',
        'Line 1 content\nLine 2 content\nLine 3 content',
        'utf-8',
      );
    });

    it('should handle complex case: delete last 5 lines and add 3 lines', async () => {
      const initialContent =
        'line1\nline2\nline3\nline4\nline5\nLine 6 content\nLine 7 content\nLine 8 content\nLine 9 content\nLine 10 content';
      mockFs.readFileSync.mockReturnValue(initialContent);

      const changes: LineChange[] = [
        { type: 'delete', lineNumber: 6 },
        { type: 'delete', lineNumber: 7 },
        { type: 'delete', lineNumber: 8 },
        { type: 'delete', lineNumber: 9 },
        { type: 'delete', lineNumber: 10 },
        { type: 'insert', lineNumber: 6, content: 'New line 1' },
        { type: 'insert', lineNumber: 7, content: 'New line 2' },
        { type: 'insert', lineNumber: 8, content: 'New line 3' },
      ];

      await applyFileLineChanges({
        fileLineChanges: [createFileLineChanges('test.txt', changes)],
        targetGit: mockGit,
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/test.txt',
        'line1\nline2\nline3\nline4\nline5\nNew line 1\nNew line 2\nNew line 3',
        'utf-8',
      );
    });

    it('should handle multiple files', async () => {
      mockFs.readFileSync
        .mockReturnValueOnce('file1 content\nline2')
        .mockReturnValueOnce('file2 line1\nfile2 line2');

      const fileLineChanges = [
        createFileLineChanges('file1.txt', [
          { type: 'insert', lineNumber: 2, content: 'inserted' },
        ]),
        createFileLineChanges('file2.txt', [{ type: 'delete', lineNumber: 1 }]),
      ];

      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/file1.txt',
        'file1 content\ninserted\nline2',
        'utf-8',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/file2.txt',
        'file2 line2',
        'utf-8',
      );
    });

    it('should handle error cases gracefully', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const changes: LineChange[] = [
        { type: 'insert', lineNumber: 1, content: 'test' },
      ];

      await expect(
        applyFileLineChanges({
          fileLineChanges: [createFileLineChanges('test.txt', changes)],
          targetGit: mockGit,
        }),
      ).rejects.toThrow('File read error');
    });

    it('should handle changes in random order', async () => {
      // Given
      const initialContent = 'line1\nline2\nline3\nline4\nline5';
      mockFs.readFileSync.mockReturnValue(initialContent);

      // Intentionally mixed order changes to test sorting logic
      const changes: LineChange[] = [
        { type: 'insert', lineNumber: 4, content: 'new line 4' },
        { type: 'delete', lineNumber: 2 },
        { type: 'insert', lineNumber: 1, content: 'new line 1' },
        { type: 'delete', lineNumber: 5 },
        { type: 'insert', lineNumber: 3, content: 'new line 3' },
        { type: 'delete', lineNumber: 3 },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges: [createFileLineChanges('test.txt', changes)],
        targetGit: mockGit,
      });

      // Then
      // Expected: deletes first (5,3,2 in reverse order), then inserts (1,3,4 in forward order)
      // Original: line1, line2, line3, line4, line5
      // After deletes: line1, line4 (removed line2, line3, line5)
      // After inserts: new line 1, line1, new line 3, new line 4, line4
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/test.txt',
        'new line 1\nline1\nnew line 3\nnew line 4\nline4',
        'utf-8',
      );
    });

    it('should handle non-consecutive deletes and inserts', async () => {
      // Given
      const initialContent = 'A\nB\nC\nD\nE\nF\nG';
      mockFs.readFileSync.mockReturnValue(initialContent);

      const changes: LineChange[] = [
        { type: 'delete', lineNumber: 1 }, // Delete A
        { type: 'delete', lineNumber: 3 }, // Delete C
        { type: 'delete', lineNumber: 5 }, // Delete E
        { type: 'insert', lineNumber: 2, content: 'New1' },
        { type: 'insert', lineNumber: 4, content: 'New2' },
        { type: 'insert', lineNumber: 7, content: 'New3' },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges: [createFileLineChanges('test.txt', changes)],
        targetGit: mockGit,
      });

      // Then
      // Original: A, B, C, D, E, F, G
      // After deletes (reverse order: 5,3,1): B, D, F, G (removed A, C, E)
      // After inserts (forward order: 2,4,7): B, New1, D, New2, F, G, New3
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/repo/path/test.txt',
        'B\nNew1\nD\nNew2\nF\nG\nNew3',
        'utf-8',
      );
    });
  });
});
