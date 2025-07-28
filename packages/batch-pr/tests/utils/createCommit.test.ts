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

  describe('command injection prevention', () => {
    test('should safely escape double quotes in commit message', () => {
      // Given
      const options = {
        message: 'feat: add "special" feature',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: add \\"special\\" feature"',
      );
    });

    test('should safely escape single quotes in commit message', () => {
      // Given
      const options = {
        message: "fix: handle user's input",
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "fix: handle user\\\'s input"',
      );
    });

    test('should safely escape backticks to prevent command substitution', () => {
      // Given
      const options = {
        message: 'feat: add `dangerous` command',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: add \\`dangerous\\` command"',
      );
    });

    test('should safely escape dollar signs to prevent variable expansion', () => {
      // Given
      const options = {
        message: 'fix: handle $PATH variable',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "fix: handle \\$PATH variable"',
      );
    });

    test('should safely escape semicolons to prevent command chaining', () => {
      // Given
      const options = {
        message: 'feat: add feature; rm -rf /',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: add feature\\; rm -rf /"',
      );
    });

    test('should safely escape ampersands to prevent background execution', () => {
      // Given
      const options = {
        message: 'feat: add feature & background command',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: add feature \\& background command"',
      );
    });

    test('should safely escape pipes to prevent command piping', () => {
      // Given
      const options = {
        message: 'feat: process | malicious command',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: process \\| malicious command"',
      );
    });

    test('should safely escape backslashes', () => {
      // Given
      const options = {
        message: 'fix: handle \\ backslash',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "fix: handle \\\\ backslash"',
      );
    });

    test('should safely escape newlines and tabs', () => {
      // Given
      const options = {
        message: 'feat: multiline\ncommit\tmessage',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: multiline\\ncommit\\tmessage"',
      );
    });

    test('should safely handle parentheses and redirects', () => {
      // Given
      const options = {
        message: 'feat: (sub) command > output < input',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "feat: \\(sub\\) command \\> output \\< input"',
      );
    });

    test('should prevent command injection with multiple attack vectors', () => {
      // Given
      const options = {
        message: 'test`whoami`$USER; cat /etc/passwd & rm -rf / | evil',
      };

      // When
      createCommit(mockGit, options);

      // Then
      expect(mockGit.exec).toHaveBeenNthCalledWith(
        2,
        'commit  -m "test\\`whoami\\`\\$USER\\; cat /etc/passwd \\& rm -rf / \\| evil"',
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
