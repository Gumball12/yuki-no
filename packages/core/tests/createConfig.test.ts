import {
  createConfig,
  inferUpstreamRepo,
  defaults as yukiNoDefaults,
} from '../createConfig';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const TEST_ENV = {
  ACCESS_TOKEN: 'test-token',
  HEAD_REPO: 'https://github.com/test/head-repo.git',
  TRACK_FROM: 'test-commit-hash',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'test/current-repo',
};

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, ...TEST_ENV };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Basic configuration creation', () => {
  it('Creates basic configuration with only required envs', () => {
    const config = createConfig();

    expect(config).toEqual({
      accessToken: TEST_ENV.ACCESS_TOKEN,
      userName: yukiNoDefaults.userName,
      email: yukiNoDefaults.email,
      upstreamRepoSpec: {
        owner: 'test',
        name: 'current-repo',
        branch: yukiNoDefaults.branch,
      },
      headRepoSpec: {
        owner: 'test',
        name: 'head-repo',
        branch: yukiNoDefaults.branch,
      },
      trackFrom: TEST_ENV.TRACK_FROM,
      include: [],
      exclude: [],
      labels: [yukiNoDefaults.label],
      releaseTracking: false,
      plugins: [],
      verbose: false,
    });
  });

  it('Checks if the specified default value is used when the GITHUB_SERVER_URL env is not present', () => {
    delete process.env.GITHUB_SERVER_URL;

    const upstreamRepoUrl = inferUpstreamRepo();

    expect(upstreamRepoUrl).toEqual(
      expect.stringContaining('https://github.com'),
    );
  });
});

describe('Custom envs processing', () => {
  it('Creates correct configuration when all envs are provided', () => {
    const LOCAL_TEST_ENV = {
      USER_NAME: 'custom-user',
      EMAIL: 'custom@example.com',
      UPSTREAM_REPO: 'https://github.com/test/upstream-repo.git',
      HEAD_REPO_BRANCH: 'develop',
      INCLUDE: '**/*.md\n**/*.ts',
      EXCLUDE: 'node_modules\ndist',
      LABELS: 'label1\nlabel2',
      RELEASE_TRACKING: 'true',
      RELEASE_TRACKING_LABELS: 'pending-release\nreleased',
      VERBOSE: 'true',
      PLUGINS: 'yuki-no-plugin-example@1.0.0',
    };

    process.env = { ...process.env, ...LOCAL_TEST_ENV };

    const config = createConfig();

    expect(config).toEqual({
      accessToken: TEST_ENV.ACCESS_TOKEN,
      userName: LOCAL_TEST_ENV.USER_NAME,
      email: LOCAL_TEST_ENV.EMAIL,
      upstreamRepoSpec: {
        owner: 'test',
        name: 'upstream-repo',
        branch: yukiNoDefaults.branch,
      },
      headRepoSpec: {
        owner: 'test',
        name: 'head-repo',
        branch: LOCAL_TEST_ENV.HEAD_REPO_BRANCH,
      },
      trackFrom: TEST_ENV.TRACK_FROM,
      include: ['**/*.md', '**/*.ts'],
      exclude: ['node_modules', 'dist'],
      labels: ['label1', 'label2'].sort(),
      releaseTracking: true,
      plugins: ['yuki-no-plugin-example@1.0.0', 'release-tracking'],
      verbose: true,
    });
  });
});

describe('Error handling', () => {
  it('Throws an error when required envs are missing', () => {
    delete process.env.ACCESS_TOKEN;

    expect(() => createConfig()).toThrow('`accessToken` is required.');

    process.env.ACCESS_TOKEN = TEST_ENV.ACCESS_TOKEN;
    delete process.env.HEAD_REPO;

    expect(() => createConfig()).toThrow('`headRepo` is required.');

    process.env.HEAD_REPO = TEST_ENV.HEAD_REPO;
    delete process.env.TRACK_FROM;

    expect(() => createConfig()).toThrow('`trackFrom` is required.');
  });

  it('Throws an error when GITHUB_REPOSITORY is missing and UPSTREAM_REPO is also missing', () => {
    delete process.env.GITHUB_REPOSITORY;

    expect(() => createConfig()).toThrow(
      'Failed to infer upstream repository: GITHUB_REPOSITORY environment variable is not set.',
    );
  });
});
