import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Repository } from '../src/repository';
import shell, { ShellString } from 'shelljs';
import type { Options } from '../src/repository';

vi.mock('../src/git', () => ({
  Git: vi.fn(() => ({
    cherryPick: vi.fn(),
    clone: vi.fn(),
    addRemote: vi.fn(),
    config: vi.fn(),
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
    repository = new Repository(mockOptions);
    vi.clearAllMocks();
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

  describe('cherry-pick handling', () => {
    it('should detect conflicts during cherry-pick', () => {
      const shellString = new ShellString('');
      shellString.code = 1;
      vi.mocked(repository.git.cherryPick).mockReturnValue(shellString);

      const hasConflicts = repository.hasConflicts('abc123');

      expect(hasConflicts).toBe(true);
      expect(repository.git.cherryPick).toHaveBeenCalledWith('abc123');
    });

    it('should handle successful cherry-pick', () => {
      const shellString = new ShellString('');
      shellString.code = 0;
      vi.mocked(repository.git.cherryPick).mockReturnValue(shellString);

      const hasConflicts = repository.hasConflicts('abc123');

      expect(hasConflicts).toBe(false);
      expect(repository.git.cherryPick).toHaveBeenCalledWith('abc123');
    });
  });
});
