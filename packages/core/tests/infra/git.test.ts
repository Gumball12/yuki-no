import { Git, GitCommandError } from '../../infra/git';

import fs from 'node:fs';
import shell from 'shelljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocking to bypass logic that would change files or make network requests
vi.mock('shelljs', () => ({
  default: {
    cd: vi.fn(),
    exec: vi.fn(() => ({ stdout: 'mocked-output', code: 0, stderr: '' })),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    rmSync: vi.fn(),
    mkdtempSync: vi.fn().mockReturnValue('/tmp/test-dir'),
  },
}));

const MOCK_CONFIG = {
  accessToken: 'test-token',
  userName: 'test-user',
  email: 'user@email.com',
  repoSpec: {
    owner: 'test',
    name: 'repo',
    branch: 'main',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Git constructor', () => {
  it('Should create Git instance without clone', () => {
    const git = new Git(MOCK_CONFIG);

    expect(git).toBeInstanceOf(Git);
    expect(shell.exec).not.toHaveBeenCalled();
  });

  it('Should create Git instance with clone when withClone is true', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const git = new Git({ ...MOCK_CONFIG, withClone: true });

    expect(git).toBeInstanceOf(Git);
    expect(shell.exec).toHaveBeenCalled();
  });
});

describe('dirName getter', () => {
  it('Should return cached dirName on subsequent calls', () => {
    const git = new Git(MOCK_CONFIG);

    const firstCall = git.dirName;
    const secondCall = git.dirName;

    expect(firstCall).toBe('/tmp/test-dir');
    expect(secondCall).toBe('/tmp/test-dir');
    expect(fs.mkdtempSync).toHaveBeenCalledTimes(1);
  });
});

describe('repoUrl getter', () => {
  it('Should return GitHub repository URL', () => {
    const git = new Git(MOCK_CONFIG);

    const result = git.repoUrl;

    expect(result).toBe('https://github.com/test/repo');
  });
});

describe('exec method', () => {
  it('Should throw GitCommandError when git command fails', () => {
    vi.mocked(shell.exec).mockReturnValue({
      stdout: 'error output',
      code: 1,
      stderr: 'git command failed',
    } as any);

    const git = new Git(MOCK_CONFIG);

    expect(() => git.exec('invalid-command')).toThrow(GitCommandError);
    expect(() => git.exec('invalid-command')).toThrow(
      'Git command failed: git invalid-command',
    );
  });
});

describe('clone method', () => {
  beforeEach(() => {
    // Reset mock to ensure consistent behavior
    vi.mocked(shell.exec).mockReturnValue({
      stdout: 'mocked-output',
      code: 0,
      stderr: '',
    } as any);
  });

  it('Should remove and clone into an existing directory', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const git = new Git(MOCK_CONFIG);
    git.clone();

    expect(shell.cd).toHaveBeenCalledWith(git.dirName);
    expect(fs.existsSync).toHaveBeenCalledWith('test-dir');
    expect(fs.rmSync).toHaveBeenCalledWith('test-dir', {
      force: true,
      recursive: true,
    });
    expect(shell.exec).toHaveBeenCalledWith(
      expect.stringMatching(
        /^git clone https:\/\/test-user:test-token@github\.com\/test\/repo /,
      ),
    );
    expect(shell.exec).toHaveBeenCalledWith('git config user.name "test-user"');
    expect(shell.exec).toHaveBeenCalledWith(
      'git config user.email "user@email.com"',
    );
  });

  it('Should clone into a directory that does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const git = new Git(MOCK_CONFIG);
    git.clone();

    expect(shell.cd).toHaveBeenCalledWith(git.dirName);
    expect(fs.existsSync).toHaveBeenCalledWith('test-dir');
    expect(fs.rmSync).not.toHaveBeenCalled();
    expect(shell.exec).toHaveBeenCalledWith(
      expect.stringMatching(
        /^git clone https:\/\/test-user:test-token@github\.com\/test\/repo /,
      ),
    );
    expect(shell.exec).toHaveBeenCalledWith('git config user.name "test-user"');
    expect(shell.exec).toHaveBeenCalledWith(
      'git config user.email "user@email.com"',
    );
  });

  it('Should complete git clone and configuration successfully', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const git = new Git(MOCK_CONFIG);

    expect(() => git.clone()).not.toThrow();

    expect(shell.exec).toHaveBeenCalledWith(
      expect.stringMatching(
        /^git clone https:\/\/test-user:test-token@github\.com\/test\/repo /,
      ),
    );
    expect(shell.exec).toHaveBeenCalledWith('git config user.name "test-user"');
    expect(shell.exec).toHaveBeenCalledWith(
      'git config user.email "user@email.com"',
    );
  });

  it('Should throw error when git config command fails after clone', () => {
    // Override the beforeEach mock for this specific test
    // git clone succeeds but git config fails
    vi.mocked(shell.exec).mockImplementation((command: string) => {
      if (command.includes('git clone')) {
        return {
          stdout: 'Cloning into...',
          code: 0,
          stderr: '',
        } as any;
      }
      if (command.includes('git config')) {
        return {
          stdout: '',
          code: 1,
          stderr: 'config failed',
        } as any;
      }
      return {
        stdout: 'mocked-output',
        code: 0,
        stderr: '',
      } as any;
    });

    const git = new Git(MOCK_CONFIG);

    expect(() => git.clone()).toThrow(GitCommandError);
  });
});

describe('GitCommandError', () => {
  it('Should create error with correct properties', () => {
    const command = 'status';
    const exitCode = 1;
    const stderr = 'error message';
    const stdout = 'output';

    const error = new GitCommandError(command, exitCode, stderr, stdout);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('GitCommandError');
    expect(error.command).toBe(command);
    expect(error.exitCode).toBe(exitCode);
    expect(error.stderr).toBe(stderr);
    expect(error.stdout).toBe(stdout);
    expect(error.message).toBe(
      'Git command failed: git status\nExit code: 1\nError: error message',
    );
  });
});
