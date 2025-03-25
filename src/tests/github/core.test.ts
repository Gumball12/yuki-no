import { GitHub } from '../../github/core';

import { Octokit } from '@octokit/rest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocking to bypass network request
vi.mock('@octokit/rest', () => {
  const MockOctokit: any = vi.fn(() => ({}));
  MockOctokit.plugin = vi.fn(() => MockOctokit);
  return { Octokit: MockOctokit };
});

const TEST_CONFIG = {
  accessToken: 'test-token',
  repoSpec: {
    owner: 'test-owner',
    name: 'test-repo',
    branch: 'main',
  },
  labels: ['label1', 'label2'],
  releaseTrackingLabels: ['pending'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getter methods', () => {
  it('ownerAndRepo should return the correct format', () => {
    const github = new GitHub(TEST_CONFIG);

    expect(github.ownerAndRepo).toEqual({
      owner: TEST_CONFIG.repoSpec.owner,
      repo: TEST_CONFIG.repoSpec.name,
    });
  });

  it('repoSpec should return the correct value', () => {
    const github = new GitHub(TEST_CONFIG);
    expect(github.repoSpec).toEqual(TEST_CONFIG.repoSpec);
  });

  it('configuredLabels should return the correct value', () => {
    const github = new GitHub(TEST_CONFIG);
    expect(github.configuredLabels).toEqual(TEST_CONFIG.labels);
  });

  it('releaseTrackingLabels should return the correct value', () => {
    const github = new GitHub(TEST_CONFIG);
    expect(github.releaseTrackingLabels).toEqual(
      TEST_CONFIG.releaseTrackingLabels,
    );
  });
});

describe('Octokit API', () => {
  describe('Rate Limit processing', () => {
    let onRateLimit: (retryAfter: number, options: any) => boolean;

    beforeEach(() => {
      new GitHub(TEST_CONFIG);
      onRateLimit = (Octokit as any).mock.calls[0][0].throttle.onRateLimit;
    });

    it('Should fail without retry when hourly request limit (over 3600 seconds) is exceeded', () => {
      const retryAfter = 3600;
      const options = { request: { retryCount: 0 } };

      const result = onRateLimit(retryAfter, options);

      expect(result).toBeFalsy();
    });

    it('Should retry when a short wait time (less than 3600 seconds) and retryCount is 0', () => {
      const retryAfter = 60;
      const options = { request: { retryCount: 0 } };

      const result = onRateLimit(retryAfter, options);

      expect(result).toBeTruthy();
    });

    it('Should fail when maximum retryCount is reached', () => {
      const retryAfter = 60;
      const options = { request: { retryCount: 1 } };

      const result = onRateLimit(retryAfter, options);

      expect(result).toBeFalsy();
    });
  });

  describe('Secondary Rate Limit handling', () => {
    let onSecondaryRateLimit: (retryAfter: number, options: any) => boolean;

    beforeEach(() => {
      new GitHub(TEST_CONFIG);
      onSecondaryRateLimit = (Octokit as any).mock.calls[0][0].throttle
        .onSecondaryRateLimit;
    });

    it('Should retry when retryCount is less than 3', () => {
      const retryAfter = 60;

      const result1 = onSecondaryRateLimit(retryAfter, {
        request: { retryCount: 0 },
      });
      expect(result1).toBeTruthy();

      const result2 = onSecondaryRateLimit(retryAfter, {
        request: { retryCount: 1 },
      });
      expect(result2).toBeTruthy();

      const result3 = onSecondaryRateLimit(retryAfter, {
        request: { retryCount: 2 },
      });
      expect(result3).toBeTruthy();
    });

    it('Should fail when maximum retryCount is reached', () => {
      const retryAfter = 60;
      const options = { request: { retryCount: 3 } };

      const result = onSecondaryRateLimit(retryAfter, options);

      expect(result).toBeFalsy();
    });
  });
});
