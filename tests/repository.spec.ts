import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from '../src/repository';
import shell, { ShellString } from 'shelljs';
import type { Options } from '../src/repository';

vi.mock('../src/git', () => ({
  Git: vi.fn(() => ({
    clone: vi.fn(),
    addRemote: vi.fn(),
    config: vi.fn(),
    fetch: vi.fn(),
    exec: vi.fn(),
  })),
}));

vi.mock('shelljs', () => ({
  default: {
    config: { silent: true },
    cd: vi.fn(),
  },
  ShellString: function (this: any, value: string) {
    this.stdout = value;
    this.code = 0;
  },
}));

describe('Repository', () => {
  let repository: Repository;
  const mockOptions: Options = {
    path: '.',
    token: 'test-token',
    userName: 'test-user',
    email: 'test@example.com',
    upstream: {
      url: 'https://github.com/test/upstream.git',
      owner: 'test',
      name: 'upstream',
      branch: 'main',
    },
    head: {
      url: 'https://github.com/test/head.git',
      owner: 'test',
      name: 'head',
      branch: 'main',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new Repository(mockOptions);
  });

  describe('setup', () => {
    it('should setup repository with correct configuration', () => {
      repository.setup();

      const setupCalls = vi.mocked(shell.cd).mock.calls;
      expect(setupCalls[0]).toEqual(['.']);
      expect(setupCalls[1]).toEqual(['upstream']);

      expect(repository.git.clone).toHaveBeenCalledWith(
        'test-user',
        'test-token',
        'https://github.com/test/upstream.git',
        'upstream',
        'tmp',
      );
      expect(repository.git.addRemote).toHaveBeenCalledWith(
        'https://github.com/test/head.git',
        'head',
      );
      expect(repository.git.config).toHaveBeenCalledWith(
        'user.name',
        '"test-user"',
      );
      expect(repository.git.config).toHaveBeenCalledWith(
        'user.email',
        '"test@example.com"',
      );
    });
  });

  describe('getReleaseInfo', () => {
    it('should return empty when no tags found', () => {
      vi.mocked(repository.git.exec).mockReturnValue({
        stdout: '',
        code: 0,
      } as ShellString);

      const result = repository.getReleaseInfo('commit-hash');

      expect(result).toEqual({});
      expect(repository.git.fetch).toHaveBeenCalledWith('head', '--tags');
    });

    it('should identify pre-release and release tags', () => {
      vi.mocked(repository.git.exec).mockReturnValue({
        stdout: 'v1.0.0-beta.1\nv1.0.0\n',
        code: 0,
      } as ShellString);

      const result = repository.getReleaseInfo('commit-hash');

      expect(result).toEqual({
        preRelease: {
          tag: 'v1.0.0-beta.1',
          url: 'https://github.com/test/head/releases/tag/v1.0.0-beta.1',
        },
        release: {
          tag: 'v1.0.0',
          url: 'https://github.com/test/head/releases/tag/v1.0.0',
        },
      });
    });

    it('should handle pre-release only', () => {
      vi.mocked(repository.git.exec).mockReturnValue({
        stdout: 'v1.0.0-beta.1\n',
        code: 0,
      } as ShellString);

      const result = repository.getReleaseInfo('commit-hash');

      expect(result).toEqual({
        preRelease: {
          tag: 'v1.0.0-beta.1',
          url: 'https://github.com/test/head/releases/tag/v1.0.0-beta.1',
        },
      });
    });

    it('should handle release only', () => {
      vi.mocked(repository.git.exec).mockReturnValue({
        stdout: 'v1.0.0\n',
        code: 0,
      } as ShellString);

      const result = repository.getReleaseInfo('commit-hash');

      expect(result).toEqual({
        release: {
          tag: 'v1.0.0',
          url: 'https://github.com/test/head/releases/tag/v1.0.0',
        },
      });
    });

    it('should handle repository URLs with and without .git extension', () => {
      const repoWithGit = new Repository({
        ...mockOptions,
        head: {
          ...mockOptions.head,
          url: 'https://github.com/test/head.git',
        },
      });

      const repoWithoutGit = new Repository({
        ...mockOptions,
        head: {
          ...mockOptions.head,
          url: 'https://github.com/test/head',
        },
      });

      vi.mocked(repoWithGit.git.exec).mockReturnValue({
        stdout: 'v1.0.0\n',
        code: 0,
      } as ShellString);

      vi.mocked(repoWithoutGit.git.exec).mockReturnValue({
        stdout: 'v1.0.0\n',
        code: 0,
      } as ShellString);

      const resultWithGit = repoWithGit.getReleaseInfo('commit-hash');
      const resultWithoutGit = repoWithoutGit.getReleaseInfo('commit-hash');

      expect(resultWithGit.release?.url).toBe(
        'https://github.com/test/head/releases/tag/v1.0.0',
      );
      expect(resultWithoutGit.release?.url).toBe(
        'https://github.com/test/head/releases/tag/v1.0.0',
      );
    });
  });
});
