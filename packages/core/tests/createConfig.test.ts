import {
  createConfig,
  inferUpstreamRepo,
  RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
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
      verbose: true,
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
      YUKI_NO_RELEASE_TRACKING_LABELS: 'pending-release\nreleased',
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
      plugins: [
        'yuki-no-plugin-example@1.0.0',
        RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
      ],
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

describe('Release tracking migration path', () => {
  it('automatically adds release-tracking plugin when RELEASE_TRACKING=true', () => {
    process.env.RELEASE_TRACKING = 'true';
    process.env.PLUGINS = 'yuki-no-plugin-example@1.0.0';

    const config = createConfig();

    expect(config.releaseTracking).toBe(true);
    expect(config.plugins).toEqual([
      'yuki-no-plugin-example@1.0.0',
      RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
    ]);
  });

  it('does not duplicate release-tracking plugin when both are specified', () => {
    process.env.RELEASE_TRACKING = 'true';
    process.env.PLUGINS = 'yuki-no-plugin-example@1.0.0\nrelease-tracking';

    const config = createConfig();

    expect(config.releaseTracking).toBe(true);
    expect(config.plugins).toEqual([
      'yuki-no-plugin-example@1.0.0',
      'release-tracking',
      RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
    ]);
  });

  it('does not add release-tracking plugin when RELEASE_TRACKING=false', () => {
    process.env.RELEASE_TRACKING = 'false';
    process.env.PLUGINS = 'yuki-no-plugin-example@1.0.0';

    const config = createConfig();

    expect(config.releaseTracking).toBe(false);
    expect(config.plugins).toEqual(['yuki-no-plugin-example@1.0.0']);
  });

  it('handles release-tracking plugin with version specification', () => {
    process.env.RELEASE_TRACKING = 'true';
    process.env.PLUGINS =
      'release-tracking@1.0.0\nyuki-no-plugin-example@1.0.0';

    const config = createConfig();

    expect(config.releaseTracking).toBe(true);
    expect(config.plugins).toEqual([
      'release-tracking@1.0.0',
      'yuki-no-plugin-example@1.0.0',
      RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
    ]);
  });

  it('handles scoped release-tracking plugin', () => {
    process.env.RELEASE_TRACKING = 'true';
    process.env.PLUGINS = RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME;

    const config = createConfig();

    expect(config.releaseTracking).toBe(true);
    expect(config.plugins).toEqual([
      RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
    ]);
  });

  it('preserves plugin order when adding release-tracking', () => {
    process.env.RELEASE_TRACKING = 'true';
    process.env.PLUGINS = 'plugin-a@1.0.0\nplugin-b@2.0.0\nplugin-c@3.0.0';

    const config = createConfig();

    expect(config.releaseTracking).toBe(true);
    expect(config.plugins).toEqual([
      'plugin-a@1.0.0',
      'plugin-b@2.0.0',
      'plugin-c@3.0.0',
      RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
    ]);
  });

  it('handles empty plugins list with release tracking enabled', () => {
    process.env.RELEASE_TRACKING = 'true';
    delete process.env.PLUGINS;

    const config = createConfig();

    expect(config.releaseTracking).toBe(true);
    expect(config.plugins).toEqual([
      RELEASE_TRACKING_COMPATIBILITY_PLUGIN_NAME,
    ]);
  });
});
