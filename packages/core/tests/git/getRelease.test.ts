import { getRelease } from '../../git/getRelease';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const MOCK_REPO_URL = 'https://github.com/username/repo';
const TEST_COMMIT_HASH = 'abcd1234';

const mockGit: any = { exec: vi.fn(), repoUrl: MOCK_REPO_URL };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getRelease - when there are no tags', () => {
  it('Should handle empty string as undefined', () => {
    mockGit.exec.mockReturnValue('');

    const result = getRelease(mockGit, TEST_COMMIT_HASH);

    expect(mockGit.exec).toHaveBeenCalledWith(
      `tag --contains ${TEST_COMMIT_HASH}`,
    );
    expect(result).toEqual({
      prerelease: undefined,
      release: undefined,
    });
  });

  it('Should handle empty as undefined', () => {
    mockGit.exec.mockReturnValue('');

    const result = getRelease(mockGit, TEST_COMMIT_HASH);

    expect(result).toEqual({
      prerelease: undefined,
      release: undefined,
    });
  });
});

describe('getRelease - when there are tags', () => {
  it('When only release exists, prerelease should be undefined', () => {
    mockGit.exec.mockReturnValue(['v1.0.0', 'v2.0.0'].join('\n'));

    const result = getRelease(mockGit, TEST_COMMIT_HASH);

    expect(result).toEqual({
      prerelease: undefined,
      release: {
        version: 'v1.0.0',
        url: `${MOCK_REPO_URL}/releases/tag/v1.0.0`,
      },
    });
  });

  it('When only prerelease exists, release should be undefined', () => {
    mockGit.exec.mockReturnValue(
      ['v1.0.0-beta.1', 'v1.0.0-alpha.1'].join('\n'),
    );

    const result = getRelease(mockGit, TEST_COMMIT_HASH);

    expect(result).toEqual({
      prerelease: {
        version: 'v1.0.0-beta.1',
        url: `${MOCK_REPO_URL}/releases/tag/v1.0.0-beta.1`,
      },
      release: undefined,
    });
  });

  it('When both exist, should properly distinguish between release and prerelease', () => {
    mockGit.exec.mockReturnValue(
      ['v1.0.0', 'v1.1.0-beta.1', 'v2.0.0'].join('\n'),
    );

    const result = getRelease(mockGit, TEST_COMMIT_HASH);

    expect(result).toEqual({
      prerelease: {
        version: 'v1.1.0-beta.1',
        url: `${MOCK_REPO_URL}/releases/tag/v1.1.0-beta.1`,
      },
      release: {
        version: 'v1.0.0',
        url: `${MOCK_REPO_URL}/releases/tag/v1.0.0`,
      },
    });
  });
});

describe('getRelease - tag URL generation', () => {
  it('prerelease tag URL should be generated correctly', () => {
    mockGit.exec.mockReturnValue('v1.0.0-beta.1');

    const result = getRelease(mockGit, TEST_COMMIT_HASH);

    expect(result.prerelease).toEqual({
      version: 'v1.0.0-beta.1',
      url: `${MOCK_REPO_URL}/releases/tag/v1.0.0-beta.1`,
    });
  });

  it('release tag URL should be generated correctly', () => {
    mockGit.exec.mockReturnValue('v1.0.0');

    const result = getRelease(mockGit, TEST_COMMIT_HASH);

    expect(result.release).toEqual({
      version: 'v1.0.0',
      url: `${MOCK_REPO_URL}/releases/tag/v1.0.0`,
    });
  });
});
