import { createCommit } from '../../utils/createCommit';

import { Git } from '@yuki-no/plugin-sdk/infra/git';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('@yuki-no/plugin-sdk/infra/git');

describe('createCommit', () => {
  let mockGit: Git;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGit = {
      exec: vi.fn(),
      dirName: '/mock/repo',
    } as unknown as Git;
  });

  describe('when creating a basic commit', () => {
    test('should execute git add and commit with message', () => {
      // Given
      const options = {
        message: 'feat: add new feature',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: add new feature"',
      );
    });
  });

  describe('when allowEmpty is true', () => {
    test('should execute commit with --allow-empty flag', () => {
      // Given
      const options = {
        message: 'chore: empty commit',
        allowEmpty: true,
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit --allow-empty -m "chore: empty commit"',
      );
    });
  });

  describe('when allowEmpty is false', () => {
    test('should execute commit without --allow-empty flag', () => {
      // Given
      const options = {
        message: 'fix: bug fix',
        allowEmpty: false,
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "fix: bug fix"',
      );
    });
  });

  describe('when needSquash is true', () => {
    test('should execute commit with --amend --no-edit flags', () => {
      // Given
      const options = {
        message: 'feat: squash commit',
        needSquash: true,
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit --amend --no-edit ',
      );
    });
  });

  describe('when needSquash is false', () => {
    test('should execute regular commit command', () => {
      // Given
      const options = {
        message: 'docs: update documentation',
        needSquash: false,
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "docs: update documentation"',
      );
    });
  });

  describe('when both needSquash and allowEmpty are true', () => {
    test('should execute amend commit with --allow-empty flag', () => {
      // Given
      const options = {
        message: 'test: squash empty commit',
        allowEmpty: true,
        needSquash: true,
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit --amend --no-edit --allow-empty',
      );
    });
  });

  describe('when both needSquash and allowEmpty are false', () => {
    test('should execute regular commit without additional flags', () => {
      // Given
      const options = {
        message: 'style: format code',
        allowEmpty: false,
        needSquash: false,
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "style: format code"',
      );
    });
  });

  describe('when message contains special characters', () => {
    test('should handle double quotes in commit message', () => {
      // Given
      const options = {
        message: 'feat: add "special" feature',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: add "special" feature"',
      );
    });

    test('should handle single quotes in commit message', () => {
      // Given
      const options = {
        message: "fix: handle user's input",
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "fix: handle user\'s input"',
      );
    });
  });

  describe('execution order', () => {
    test('should always execute git add before commit', () => {
      // Given
      const options = {
        message: 'test: execution order',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenCalledTimes(2);
      expect(mockGit.exec).toHaveBeenNthCalledWith(1, 'add .');
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "test: execution order"',
      );
    });
  });
});
