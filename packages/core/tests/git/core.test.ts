import { Git, TEMP_DIR } from '../../git/core';

import fs from 'node:fs';
import path from 'node:path';
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
  default: { existsSync: vi.fn(), rmSync: vi.fn() },
}));

vi.mock('../../git/utils', () => ({
  createRepoUrl: vi.fn().mockReturnValue('https://github.com/test/repo.git'),
}));

const MOCK_CONFIG = {
  accessToken: 'test-token',
  userName: 'test-user',
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
  it('Should execute Git commands correctly', () => {
    const git = new Git(MOCK_CONFIG);

    const repoDir = path.resolve(TEMP_DIR, MOCK_CONFIG.repoSpec.name);
    const result = git.exec('status');

    expect(shell.cd).toHaveBeenCalledWith(repoDir);
    expect(shell.exec).toHaveBeenCalledWith('git status');
    expect(result).toBe('mocked-output');
  });
});

describe('clone method', () => {
  it('Should remove and clone into an existing directory', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const git = new Git(MOCK_CONFIG);
    git.clone();

    expect(shell.cd).toHaveBeenCalledWith(TEMP_DIR);
    expect(fs.existsSync).toHaveBeenCalledWith(MOCK_CONFIG.repoSpec.name);
    expect(fs.rmSync).toHaveBeenCalledWith(MOCK_CONFIG.repoSpec.name, {
      force: true,
      recursive: true,
    });
    expect(shell.exec).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          [
            '^git clone',
            `https://${MOCK_CONFIG.userName}:${MOCK_CONFIG.accessToken}@github.com/${MOCK_CONFIG.repoSpec.owner}/${MOCK_CONFIG.repoSpec.name}\.git`,
            'repo$',
          ].join(' '),
        ),
      ),
    );
  });

  it('Should clone into a directory that does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const git = new Git(MOCK_CONFIG);
    git.clone();

    expect(shell.cd).toHaveBeenCalledWith(TEMP_DIR);
    expect(fs.existsSync).toHaveBeenCalledWith(MOCK_CONFIG.repoSpec.name);
    expect(fs.rmSync).not.toHaveBeenCalled();
    expect(shell.exec).toHaveBeenCalledWith(
      expect.stringMatching(
        /^git clone https:\/\/test-user:test-token@github\.com\/test\/repo\.git repo$/,
      ),
    );
  });

  it('Should throw an error if cloning fails', () => {
    vi.mocked(shell.exec).mockReturnValueOnce({
      stdout: '',
      code: 1,
      stderr: 'Authentication failed',
    } as any);

    const git = new Git(MOCK_CONFIG);

    expect(() => git.clone()).toThrow(
      'Failed to clone repository: Authentication failed',
    );
  });
});
