import { applyFileLineChanges } from '../../utils/applyFileLineChanges';
import { FileLineChanges } from '../../utils/extractFileLineChanges';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('node:fs');
vi.mock('@yuki-no/plugin-sdk/infra/git');

const mockFs = vi.mocked(fs);
const mockGit = {
  dirName: '/mock/repo',
  exec: vi.fn(),
} as unknown as Git;

describe('applyFileLineChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when given empty changes', () => {
    test('should return without doing anything', async () => {
      // Given
      const fileLineChanges: FileLineChanges[] = [];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('when applying single line insertion', () => {
    test('should insert line at correct position', async () => {
      // Given
      const fileContent = 'line1\nline2\nline3';
      const expectedFilePath = path.join('/mock/repo', 'test.ts');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(fileContent);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'test.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 2,
              content: 'new line',
            },
          ],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'utf-8',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'line1\nnew line\nline2\nline3',
        'utf-8',
      );
    });
  });

  describe('when applying single line deletion', () => {
    test('should delete line at correct position', async () => {
      // Given
      const fileContent = 'line1\nline2\nline3';
      const expectedFilePath = path.join('/mock/repo', 'test.ts');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(fileContent);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'test.ts',
          changes: [
            {
              type: 'delete',
              lineNumber: 2,
            },
          ],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'line1\nline3',
        'utf-8',
      );
    });
  });

  describe('when applying mixed insertions and deletions', () => {
    test('should process deletions first (reverse order) then insertions (forward order)', async () => {
      // Given
      const fileContent = 'line1\nline2\nline3\nline4';
      const expectedFilePath = path.join('/mock/repo', 'test.ts');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(fileContent);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'test.ts',
          changes: [
            { type: 'delete', lineNumber: 2 }, // Delete line2
            { type: 'delete', lineNumber: 4 }, // Delete line4
            { type: 'insert', lineNumber: 1, content: 'inserted at 1' },
            { type: 'insert', lineNumber: 3, content: 'inserted at 3' },
          ],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      // Expected result after deletions (reverse order: 4, then 2): line1, line3
      // Then insertions (forward order: 1, then 3): inserted at 1, line1, inserted at 3, line3
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'inserted at 1\nline1\ninserted at 3\nline3',
        'utf-8',
      );
    });
  });

  describe('when file does not exist', () => {
    test('should create empty file and apply changes', async () => {
      // Given
      const expectedFilePath = path.join('/mock/repo', 'new-file.ts');

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'new-file.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: 'first line',
            },
          ],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'first line',
        'utf-8',
      );
    });
  });

  describe('when deleting line beyond file boundaries', () => {
    test('should handle gracefully without error', async () => {
      // Given
      const fileContent = 'line1\nline2';
      const expectedFilePath = path.join('/mock/repo', 'test.ts');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(fileContent);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'test.ts',
          changes: [
            {
              type: 'delete',
              lineNumber: 5, // Beyond file boundaries
            },
          ],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      // Should not crash and file content should remain unchanged
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'line1\nline2',
        'utf-8',
      );
    });
  });

  describe('when processing empty file', () => {
    test('should handle insertions correctly', async () => {
      // Given
      const fileContent = '';
      const expectedFilePath = path.join('/mock/repo', 'empty.ts');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(fileContent);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'empty.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: 'first line in empty file',
            },
          ],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'first line in empty file\n',
        'utf-8',
      );
    });
  });

  describe('when target directory does not exist', () => {
    test('should create directory recursively', async () => {
      // Given
      const expectedFilePath = path.join('/mock/repo', 'nested/deep/test.ts');
      const expectedDir = path.dirname(expectedFilePath);

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'nested/deep/test.ts',
          changes: [
            {
              type: 'insert',
              lineNumber: 1,
              content: 'content',
            },
          ],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expectedDir, {
        recursive: true,
      });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expectedFilePath,
        'content',
        'utf-8',
      );
    });
  });

  describe('when processing multiple files', () => {
    test('should apply changes to all files', async () => {
      // Given
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync
        .mockReturnValueOnce('file1 content')
        .mockReturnValueOnce('file2 content');
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const fileLineChanges: FileLineChanges[] = [
        {
          fileName: 'file1.ts',
          changes: [{ type: 'insert', lineNumber: 1, content: 'new line' }],
        },
        {
          fileName: 'file2.ts',
          changes: [{ type: 'insert', lineNumber: 1, content: 'another line' }],
        },
      ];

      // When
      await applyFileLineChanges({
        fileLineChanges,
        targetGit: mockGit,
      });

      // Then
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join('/mock/repo', 'file1.ts'),
        'new line\nfile1 content',
        'utf-8',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join('/mock/repo', 'file2.ts'),
        'another line\nfile2 content',
        'utf-8',
      );
    });
  });
});
