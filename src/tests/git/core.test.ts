import { Git, GitCommandError, TEMP_DIR } from '../../git/core';

import fs from 'node:fs';
import shell from 'shelljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocking to bypass logic that would change files or make network requests
vi.mock('shelljs', () => ({
  default: {
    cd: vi.fn(),
    exec: vi.fn(() => ({ stdout: 'mocked-output', code: 0 })),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    rmSync: vi.fn(),
    mkdtempSync: vi.fn().mockReturnValue('/tmp/cloned-by-yuki-no-123456'),
  },
}));

vi.mock('../../git/utils', () => ({
  createRepoUrl: vi.fn().mockReturnValue('https://github.com/test/repo.git'),
}));

vi.mock('../../utils', () => ({
  createTempDir: vi.fn().mockReturnValue('/tmp/cloned-by-yuki-no-123456'),
  log: vi.fn(),
}));

const MOCK_CONFIG = {
  accessToken: 'test-token',
  userName: 'test-user',
  email: 'user@dot.com',
  repoSpec: {
    owner: 'test',
    name: 'repo',
    branch: 'main',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exec method', () => {
  it('Should execute Git commands correctly when successful', () => {
    vi.mocked(shell.exec).mockReturnValue({
      stdout: 'mocked-output',
      code: 0,
      stderr: '',
    } as any);

    const git = new Git(MOCK_CONFIG);
    const result = git.exec('status');

    expect(shell.cd).toHaveBeenCalledWith('/tmp/cloned-by-yuki-no-123456');
    expect(shell.exec).toHaveBeenCalledWith('git status');
    expect(result).toBe('mocked-output');
  });

  it('Should throw GitCommandError when git command fails', () => {
    vi.mocked(shell.exec).mockReturnValue({
      stdout: 'partial output',
      code: 1,
      stderr: 'fatal: not a git repository',
    } as any);

    const git = new Git(MOCK_CONFIG);

    expect(() => git.exec('status')).toThrow(GitCommandError);

    try {
      git.exec('status');
    } catch (error) {
      expect(error).toBeInstanceOf(GitCommandError);
      const gitError = error as GitCommandError;
      expect(gitError.name).toBe('GitCommandError');
      expect(gitError.command).toBe('status');
      expect(gitError.exitCode).toBe(1);
      expect(gitError.stderr).toBe('fatal: not a git repository');
      expect(gitError.stdout).toBe('partial output');
      expect(gitError.message).toContain('Git command failed: git status');
      expect(gitError.message).toContain('Exit code: 1');
      expect(gitError.message).toContain('Error: fatal: not a git repository');
    }
  });

  it('Should trim stdout output when successful', () => {
    vi.mocked(shell.exec).mockReturnValue({
      stdout: '  output with spaces  \n',
      code: 0,
      stderr: '',
    } as any);

    const git = new Git(MOCK_CONFIG);
    const result = git.exec('status');

    expect(result).toBe('output with spaces');
  });
});

describe('clone method', () => {
  it('Should remove and clone into an existing directory', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const git = new Git(MOCK_CONFIG);
    git.clone();

    expect(shell.cd).toHaveBeenCalledWith(TEMP_DIR);
    expect(fs.existsSync).toHaveBeenCalledWith('/tmp/cloned-by-yuki-no-123456');
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/cloned-by-yuki-no-123456', {
      force: true,
      recursive: true,
    });

    // Check all shell.exec calls
    expect(shell.exec).toHaveBeenNthCalledWith(
      1,
      `git clone https://${MOCK_CONFIG.userName}:${MOCK_CONFIG.accessToken}@github.com/${MOCK_CONFIG.repoSpec.owner}/${MOCK_CONFIG.repoSpec.name}.git /tmp/cloned-by-yuki-no-123456`,
    );
    expect(shell.exec).toHaveBeenNthCalledWith(
      2,
      `git config user.name "${MOCK_CONFIG.userName}"`,
    );
    expect(shell.exec).toHaveBeenNthCalledWith(
      3,
      `git config user.email "${MOCK_CONFIG.email}"`,
    );
  });

  it('Should clone into a directory that does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const git = new Git(MOCK_CONFIG);
    git.clone();

    expect(shell.cd).toHaveBeenCalledWith(TEMP_DIR);
    expect(fs.existsSync).toHaveBeenCalledWith('/tmp/cloned-by-yuki-no-123456');
    expect(fs.rmSync).not.toHaveBeenCalled();

    // Check all shell.exec calls
    expect(shell.exec).toHaveBeenNthCalledWith(
      1,
      `git clone https://${MOCK_CONFIG.userName}:${MOCK_CONFIG.accessToken}@github.com/${MOCK_CONFIG.repoSpec.owner}/${MOCK_CONFIG.repoSpec.name}.git /tmp/cloned-by-yuki-no-123456`,
    );
    expect(shell.exec).toHaveBeenNthCalledWith(
      2,
      `git config user.name "${MOCK_CONFIG.userName}"`,
    );
    expect(shell.exec).toHaveBeenNthCalledWith(
      3,
      `git config user.email "${MOCK_CONFIG.email}"`,
    );
  });

  it('Should throw an error if cloning fails', () => {
    vi.mocked(shell.exec)
      .mockReturnValueOnce({
        stdout: '',
        code: 1,
        stderr: 'Authentication failed',
      } as any)
      // Mock subsequent calls for config commands - first one will fail
      .mockReturnValueOnce({
        stdout: '',
        code: 1,
        stderr: 'config: permission denied',
      } as any);

    const git = new Git(MOCK_CONFIG);

    expect(() => git.clone()).toThrow(GitCommandError);
  });

  it('Should throw GitCommandError if git config commands fail during clone', () => {
    vi.mocked(shell.exec)
      .mockReturnValueOnce({
        stdout: 'Cloning successful',
        code: 0,
        stderr: '',
      } as any)
      .mockReturnValueOnce({
        stdout: '',
        code: 1,
        stderr: 'config: permission denied',
      } as any);

    const git = new Git(MOCK_CONFIG);

    expect(() => git.clone()).toThrow(GitCommandError);

    try {
      git.clone();
    } catch (error) {
      expect(error).toBeInstanceOf(GitCommandError);
      const gitError = error as GitCommandError;
      expect(gitError.name).toBe('GitCommandError');
      expect(gitError.command).toBe(
        `config user.name "${MOCK_CONFIG.userName}"`,
      );
      expect(gitError.exitCode).toBe(1);
      expect(gitError.stderr).toBe('config: permission denied');
    }
  });
});
